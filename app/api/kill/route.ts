import { NextResponse } from "next/server";

export async function GET() {
  console.log("Shutting down development/production server programmatically to clear stale VFS cache...");
  setTimeout(() => {
    process.exit(0);
  }, 1000);
  
  return NextResponse.json({ message: "Server shutting down..." });
}
