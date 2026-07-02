import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

// next/og needs Node here because we query Prisma (not edge-compatible) and
// fetch the logo server-side. force-dynamic so a logo change is reflected in
// the preview without waiting on static caching.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const alt = "Teaketer Store";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CANVAS_BG = "#0a0a0a";
const ACCENT = "#c4f23a";
const INK = "#f7efe2";

// Two-letter initials on an hsl swatch derived from the vendor id, matching the
// homepage store-card background (app/page.tsx line 131). We sum ALL characters
// of the id — using only charCodeAt(0) collides, because every cuid starts with
// 'c' and would give every store the identical hue.
function fallbackHue(id: string): number {
  return id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;
}

function initials(storeName: string): string {
  return (storeName || "?").slice(0, 2).toUpperCase();
}

// Rewrite a Cloudinary delivery URL to a small square PNG so Satori decodes it
// reliably (raw multi-MB JPEGs render blank). Inserts the transform right after
// "/upload/". Leaves non-Cloudinary URLs untouched.
function toCloudinaryThumb(url: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/f_png,w_240,h_240,c_fill,q_auto/");
}

// A neutral, always-valid card so a shared link never renders a broken preview,
// even for a missing / unapproved / deactivated store.
function genericCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: CANVAS_BG,
          color: INK,
          fontSize: 64,
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}
      >
        <span style={{ color: ACCENT }}>Teaketer</span>
        <span style={{ marginLeft: 16 }}>Store</span>
      </div>
    ),
    { ...size }
  );
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { storeSlug: slug },
    select: {
      id: true,
      storeName: true,
      storeDescription: true,
      logoUrl: true,
      isApproved: true,
      isActive: true,
    },
  });

  // Never notFound() in an image route — crawlers must still get a 200 image.
  if (!vendor || !vendor.isApproved || !vendor.isActive) {
    return genericCard();
  }

  const name = vendor.storeName || "Teaketer Store";
  const description = vendor.storeDescription || "";

  // Try to load the logo as bytes. Satori can't reliably resolve a remote
  // <img src>, so we fetch it ourselves and embed as a data URL. Any failure
  // (empty URL, network, non-image) falls through to the initials swatch.
  //
  // Cloudinary source images are often multi-MB JPEGs, which Satori decodes
  // unreliably (renders blank). We rewrite the delivery URL to a small, fixed
  // 240×240 PNG via a Cloudinary transform so the embed is always small and
  // decodes cleanly. Non-Cloudinary URLs are fetched as-is.
  // Cap the logo fetch: logoUrl is vendor-controlled and may point anywhere
  // (settings only trims it), and this route is force-dynamic + crawler-hit.
  // Without a timeout a slow host pins the function; without a size cap a huge
  // body OOMs it. Bound both; any breach falls through to the initials swatch.
  const MAX_LOGO_BYTES = 2_000_000;
  let logoDataUrl: string | null = null;
  if (vendor.logoUrl) {
    const optimized = toCloudinaryThumb(vendor.logoUrl);
    try {
      const res = await fetch(optimized, { signal: AbortSignal.timeout(3000) });
      const contentTypeHeader = res.headers.get("content-type") ?? "";
      const declaredLength = Number(res.headers.get("content-length") ?? "0");
      if (res.ok && contentTypeHeader.startsWith("image/") && declaredLength <= MAX_LOGO_BYTES) {
        const buf = Buffer.from(await res.arrayBuffer());
        // Re-check actual size in case content-length was absent or lied.
        if (buf.byteLength <= MAX_LOGO_BYTES) {
          logoDataUrl = `data:${contentTypeHeader};base64,${buf.toString("base64")}`;
        }
      }
    } catch {
      logoDataUrl = null;
    }
  }

  const hue = fallbackHue(vendor.id);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: CANVAS_BG,
          padding: "80px",
        }}
      >
        {/* Logo or initials swatch */}
        {logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoDataUrl}
            width={240}
            height={240}
            style={{
              width: 240,
              height: 240,
              borderRadius: 48,
              objectFit: "cover",
              border: "6px solid rgba(255,255,255,0.9)",
            }}
          />
        ) : (
          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: 48,
              background: `hsl(${hue}, 20%, 82%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 96,
              fontWeight: 900,
              color: "white",
            }}
          >
            {initials(name)}
          </div>
        )}

        {/* Store name */}
        <div
          style={{
            marginTop: 44,
            fontSize: 58,
            fontWeight: 800,
            lineHeight: 1.15,
            paddingTop: 6,
            paddingBottom: 6,
            color: INK,
            letterSpacing: "-0.02em",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {name.length > 40 ? `${name.slice(0, 40)}…` : name}
        </div>

        {/* Description — capped so it fits on a single line at this size/width.
            Satori clips wrapped overflow silently, so we truncate short rather
            than rely on line-clamping (which it doesn't support). */}
        {description ? (
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 28,
              color: "rgba(247,239,226,0.6)",
              textAlign: "center",
              maxWidth: 900,
            }}
          >
            {description.length > 58 ? `${description.slice(0, 58).trimEnd()}…` : description}
          </div>
        ) : null}

        {/* Brand footer */}
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: 10, background: ACCENT, marginRight: 12 }} />
          <span style={{ color: "rgba(247,239,226,0.55)" }}>Teaketer Store</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
