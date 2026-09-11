"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { AvatarColor } from "@/lib/campaign-wizard/types";


const QR_PATTERN = [
  1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0,
  1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1,
  0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1,
];

function QrPlaceholder({ size = 56 }: { size?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        bgcolor: "#FFFFFF",
        borderRadius: "6px",
        p: "4px",
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gridTemplateRows: "repeat(8, 1fr)",
        gap: "1.5px",
      }}
    >
      {QR_PATTERN.map((on, i) => (
        <Box key={i} sx={{ bgcolor: on ? "#1B1B19" : "transparent" }} />
      ))}
    </Box>
  );
}

export default function SealPreviewPanel({
  campaignName,
  initials,
  avatarColor,
  logoPreviewUrl,
  size = "default",
}: {
  campaignName: string;
  initials: string;
  avatarColor: AvatarColor;
  logoPreviewUrl?: string | null;
  size?: "default" | "large";
}) {
  const large = size === "large";

  return (
    <Box
      sx={{
        bgcolor: "primary.main",
        borderRadius: 3,
        height: large ? 420 : { xs: 320, md: "100%" },
        minHeight: large ? 420 : 340,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        px: 3,
        py: 4,
        position: "relative",
      }}
    >
      {!large && (
        <Typography
          variant="overline"
          sx={{
            position: "absolute",
            top: 20,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: 1.5,
          }}
        >
          Pré-visualização
        </Typography>
      )}

      <Box
        sx={{
          width: large ? 220 : 180,
          height: large ? 220 : 180,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.35)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: large ? 72 : 64,
            height: large ? 72 : 64,
            borderRadius: "50%",
            bgcolor: logoPreviewUrl ? "transparent" : "background.default",
            color: `var(--color-avatar-${avatarColor}-text)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: large ? "1.25rem" : "1.1rem",
            overflow: "hidden",
            backgroundImage: logoPreviewUrl ? `url(${logoPreviewUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {!logoPreviewUrl && initials}
        </Box>

        <Typography
          variant="subtitle2"
          sx={{
            color: "primary.contrastText",
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.25,
            px: 1,
          }}
        >
          {campaignName || "Nome da campanha"}
        </Typography>

        <QrPlaceholder size={large ? 60 : 48} />
      </Box>
    </Box>
  );
}
