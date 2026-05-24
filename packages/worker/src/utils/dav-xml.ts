import type { FileRecord } from "../types";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatHttpDate(iso: string): string {
  return new Date(iso).toUTCString();
}

function buildPropEntry(href: string, file: FileRecord | null, isRoot?: boolean): string {
  if (isRoot) {
    return `<D:response>
<D:href>${escapeXml(href)}</D:href>
<D:propstat>
<D:prop>
<D:resourcetype><D:collection/></D:resourcetype>
<D:displayname>/</D:displayname>
<D:getlastmodified>${new Date().toUTCString()}</D:getlastmodified>
<D:getcontentlength>0</D:getcontentlength>
</D:prop>
<D:status>HTTP/1.1 200 OK</D:status>
</D:propstat>
</D:response>`;
  }

  if (!file) return "";

  const isDir = file.is_dir === 1;
  const resourceType = isDir ? "<D:collection/>" : "";
  const displayName = escapeXml(file.name);
  const lastModified = formatHttpDate(file.updated_at);

  let props = `<D:resourcetype>${resourceType}</D:resourcetype>
<D:displayname>${displayName}</D:displayname>
<D:getlastmodified>${lastModified}</D:getlastmodified>
<D:getcontentlength>${isDir ? 0 : file.size}</D:getcontentlength>`;

  if (!isDir) {
    props += `\n<D:getcontenttype>${escapeXml(file.mime_type || "application/octet-stream")}</D:getcontenttype>`;
  }

  return `<D:response>
<D:href>${escapeXml(href)}</D:href>
<D:propstat>
<D:prop>
${props}
</D:prop>
<D:status>HTTP/1.1 200 OK</D:status>
</D:propstat>
</D:response>`;
}

export function buildMultistatus(
  basePath: string,
  currentFile: FileRecord | null,
  children: FileRecord[],
  isRoot: boolean
): string {
  const entries: string[] = [];

  const selfHref = isRoot ? basePath : `${basePath}${currentFile ? (currentFile.is_dir ? "/" : "") : ""}`;
  entries.push(buildPropEntry(selfHref, currentFile, isRoot));

  for (const child of children) {
    const childHref = `${basePath}${isRoot ? "" : "/"}${encodeURIComponent(child.name)}${child.is_dir ? "/" : ""}`;
    entries.push(buildPropEntry(childHref, child));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<D:multistatus xmlns:D="DAV:">
${entries.join("\n")}
</D:multistatus>`;
}
