import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaUrl = searchParams.get('url');

    if (!mediaUrl) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Determine content type heuristically
    let contentType = "application/octet-stream";
    const lowerUrl = mediaUrl.toLowerCase();
    if (lowerUrl.endsWith(".pdf")) contentType = "application/pdf";
    else if (lowerUrl.endsWith(".mp4")) contentType = "video/mp4";
    else if (lowerUrl.endsWith(".webm")) contentType = "video/webm";

    // Fetch the binary stream using native fetch
    const response = await fetch(mediaUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      console.error(`Proxy fetch failed: ${response.status} ${response.statusText}`, mediaUrl);
      return NextResponse.json({ 
        error: "Failed to fetch media binary", 
        details: `Upstream responded with ${response.status} ${response.statusText}` 
      }, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();

    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("Content-Type") || contentType);
    headers.set("Content-Disposition", "inline");
    headers.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error("Error proxying media:", error.message, error.cause);
    return NextResponse.json({ error: "Failed to fetch media binary", details: error.message }, { status: 500 });
  }
}
