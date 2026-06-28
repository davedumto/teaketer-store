import { NextRequest, NextResponse } from "next/server";
import { getVendorFromRequest } from "@/lib/vendorAuth";
import { getPusherServer, vendorChannel } from "@/lib/pusher";

// Pusher private-channel auth endpoint
export async function POST(req: NextRequest) {
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id") ?? "";
  const channel = params.get("channel_name") ?? "";

  // Only allow vendors to auth their own private channel
  if (channel !== vendorChannel(vendor.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pusher = getPusherServer();
  const auth = pusher.authorizeChannel(socketId, channel);
  return NextResponse.json(auth);
}
