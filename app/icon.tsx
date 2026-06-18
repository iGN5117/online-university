import { ImageResponse } from "next/og";

// Generated app icon (also used by the web manifest): 🎓 on the app's teal.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 320,
        }}
      >
        🎓
      </div>
    ),
    size,
  );
}
