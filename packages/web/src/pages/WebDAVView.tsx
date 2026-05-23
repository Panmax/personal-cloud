import { useState } from "react";
import { HardDrive, Copy, Check, MonitorPlay, Globe } from "lucide-react";
import { BASE } from "../api/client";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors">
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export function WebDAVView() {
  const davUrl = `${BASE}/dav/`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
        <Globe className="w-5 h-5 text-slate-500" />
        <div>
          <h2 className="font-semibold text-slate-800">WebDAV</h2>
          <p className="text-xs text-slate-400">Connect media players and file managers</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <section className="bg-slate-50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Connection Info</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">Server URL</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-mono">{davUrl}</code>
                <CopyButton text={davUrl} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Username</label>
                <p className="mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700">any (ignored)</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Password</label>
                <p className="mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700">Your login password</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <MonitorPlay className="w-4 h-4" />
            Player Setup
          </h3>
          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-700">VLC</h4>
              <ol className="text-xs text-slate-500 mt-2 space-y-1 list-decimal list-inside">
                <li>Media → Open Network Stream</li>
                <li>Enter the Server URL above</li>
                <li>Enter password when prompted</li>
              </ol>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-700">IINA</h4>
              <ol className="text-xs text-slate-500 mt-2 space-y-1 list-decimal list-inside">
                <li>File → Open URL</li>
                <li>Paste the direct file URL (e.g. {davUrl}Videos/movie.mp4)</li>
                <li>Enter password when prompted</li>
              </ol>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-700">Infuse</h4>
              <ol className="text-xs text-slate-500 mt-2 space-y-1 list-decimal list-inside">
                <li>Add Share → WebDAV</li>
                <li>Address: paste Server URL</li>
                <li>Username: anything, Password: your login password</li>
                <li>Save → Browse your files</li>
              </ol>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-700">macOS Finder</h4>
              <ol className="text-xs text-slate-500 mt-2 space-y-1 list-decimal list-inside">
                <li>Go → Connect to Server (⌘K)</li>
                <li>Enter the Server URL</li>
                <li>Connect as Registered User, enter password</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-amber-800">Note</h3>
          <p className="text-xs text-amber-700 mt-1">
            WebDAV access is read-only. You can browse directories and play/download files, but uploading, renaming, or deleting via WebDAV is not supported. Use the web interface for those operations.
          </p>
        </section>
      </div>
    </div>
  );
}
