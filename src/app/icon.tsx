import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** A tally mark on cream. Generated, so there is no binary in the repo and no
 *  second place where the palette is written down. */
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
          background: "#f6f2e9",
          color: "#221e17",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        ||||
      </div>
    ),
    size,
  );
}
