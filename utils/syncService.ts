import { supabase } from './supabaseClient';

const camelToSnake = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const convertObjectKeysToSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => convertObjectKeysToSnakeCase(v));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      // Treat customFields or items (inside invoice) properly or leave them as jsonb
      result[camelToSnake(key)] = convertObjectKeysToSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

const uploadBase64ToStorage = async (base64Str: string, bucket: string, path: string): Promise<string | null> => {
  try {
    const match = base64Str.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!match) return null;
    const contentType = match[1];
    const b64Data = match[2];
    
    // Decode base64 (using browser atob)
    const byteString = atob(b64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: contentType });

    // Upload
    const { data, error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType,
      upsert: true
    });

    if (error) throw error;

    // Get Public URL
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicData.publicUrl;
  } catch (e) {
    console.error("Storage upload error:", e);
    return null;
  }
};

// Helper to push changes to Supabase without blocking the UI
export const syncPush = async (table: string, payload: any) => {
  try {
    let finalPayload = { ...payload };

    // Offload base64 images to Supabase Storage
    const imageField = finalPayload.image ? 'image' : (finalPayload.imageUrl ? 'imageUrl' : null);
    
    if (imageField && typeof finalPayload[imageField] === 'string' && finalPayload[imageField].startsWith('data:image')) {
      const fileName = `${payload.id}-${Date.now()}.png`;
      const bucket = table === 'products' ? 'product_images' : 'bill_scans';
      const publicUrl = await uploadBase64ToStorage(finalPayload[imageField], bucket, fileName);
      
      if (publicUrl) {
        finalPayload[imageField] = publicUrl;
        
        // Update Local Storage silently to free up space, without recursive syncPush
        if (typeof window !== "undefined") {
          try {
            const lsConfig = localStorage.getItem(table);
            if (lsConfig) {
              const parsed = JSON.parse(lsConfig);
              const idx = parsed.findIndex((i: any) => i.id === payload.id);
              if (idx !== -1) {
                parsed[idx][imageField] = publicUrl;
                localStorage.setItem(table, JSON.stringify(parsed));
              }
            }
          } catch (e) {}
        }
      }
    }

    const snakeCasePayload = convertObjectKeysToSnakeCase(finalPayload);
    
    // Conflict Resolution: Read before write
    if (snakeCasePayload.updated_at) {
      try {
        const { data: remoteData, error: fetchError } = await supabase
          .from(table)
          .select('updated_at')
          .eq('id', payload.id)
          .maybeSingle();

        if (!fetchError && remoteData && remoteData.updated_at) {
          const remoteTime = new Date(remoteData.updated_at).getTime();
          const localTime = new Date(snakeCasePayload.updated_at).getTime();
          
          if (remoteTime > localTime) {
            console.log(`Sync Conflict: Remote data for ${table} (${payload.id}) is newer. Skipping push to avoid overwriting.`);
            return; // Abort push
          }
        }
      } catch (e) {
        console.warn("Could not fetch remote updated_at for conflict resolution", e);
      }
    }

    const { error } = await supabase.from(table).upsert(snakeCasePayload, { onConflict: 'id' });
    if (error) {
      console.error(`Supabase Sync Error [upsert to ${table}]:`, error.message);
    }
  } catch (err) {
    console.error(`Supabase Sync Error [upsert to ${table}]:`, err);
  }
};

export const syncDelete = async (table: string, id: string) => {
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.error(`Supabase Sync Error [delete from ${table}]:`, error.message);
    }
  } catch (err) {
    console.error(`Supabase Sync Error [delete from ${table}]:`, err);
  }
};

const snakeToCamel = (str: string) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

const convertObjectKeysToCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => convertObjectKeysToCamelCase(v));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      result[snakeToCamel(key)] = convertObjectKeysToCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

// Syncs all data from Supabase to local storage (could be called on initial load)
export const initialSyncFromSupabase = async (
  tableName: string, 
  loadLocal: () => any,
  saveToLocal: (data: any) => void
) => {
  try {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) {
      console.error(`Supabase Sync Error [fetch from ${tableName}]:`, error.message);
      return;
    }
    if (data) {
      const camelCaseRemote = convertObjectKeysToCamelCase(data);
      const localData = loadLocal();
      
      if (!Array.isArray(localData)) {
        // Business info is an object, not array
        if (camelCaseRemote.length > 0) {
          saveToLocal(camelCaseRemote[0]);
        }
      } else {
        const mergedMap = new Map();
        // Existing local items priority lower than remote for pure pull, 
        // but if missing in remote, keep local and push it? 
        // A simple approach: merge both maps.
        localData.forEach((item: any) => {
          if (item?.id) mergedMap.set(item.id, item);
        });
        camelCaseRemote.forEach((item: any) => {
          if (item?.id) mergedMap.set(item.id, item);
        });
        saveToLocal(Array.from(mergedMap.values()));
      }
    }
  } catch (err) {
    console.error(`Supabase Sync Error [fetch from ${tableName}]:`, err);
  }
};

