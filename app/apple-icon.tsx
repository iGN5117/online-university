import { ImageResponse } from "next/og";

// iOS home-screen icon for "Add to Home Screen".
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2f8f86",
          fontSize: 120,
        }}
      >
        🎓
      </div>
    ),
    size,
  );
}
