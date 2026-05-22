import { Folder, FileText, Image, Video, Music, Archive, File } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function getFileIcon(mime: string | null, isDir: boolean): { icon: LucideIcon; className: string } {
  if (isDir) return { icon: Folder, className: "text-brand-500" };
  if (!mime) return { icon: File, className: "text-slate-400" };
  if (mime.startsWith("image/")) return { icon: Image, className: "text-pink-500" };
  if (mime.startsWith("video/")) return { icon: Video, className: "text-purple-500" };
  if (mime.startsWith("audio/")) return { icon: Music, className: "text-green-500" };
  if (mime.includes("zip") || mime.includes("tar") || mime.includes("rar") || mime.includes("7z"))
    return { icon: Archive, className: "text-amber-500" };
  if (mime.startsWith("text/") || mime === "application/json" || mime === "application/javascript")
    return { icon: FileText, className: "text-blue-500" };
  return { icon: File, className: "text-slate-400" };
}
