import { z } from "zod";

export const ButtonVariantSchema = z.enum([
  "bluePrimary",
  "blueSecondary",
  "graySecondary",
  "grayOutline",
  "greenSuccess",
  "greenTonal",
  "redDanger",
  "redGhost",
  "amberWarning",
  "orangePrimary",
  "blackPrimary",
  "whiteOutline",
  "slateDark",
  "link",
  "linkDanger",
  "ghost",
  "x",
  "close",
  "flex",
  "disabled",
  "unstyled",
  "yellowPrimary",
]);

export type ButtonVariant = z.infer<typeof ButtonVariantSchema>;
