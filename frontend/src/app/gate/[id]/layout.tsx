/** Placeholder for static export; real branch ids resolve from the URL. */
export function generateStaticParams() {
  return [{ id: '_' }];
}

/**
 * Pre-hydration app hand-off.
 *
 * Runs while the HTML is still parsing — before React loads — so a scanned
 * desk QR on a phone bounces into the Conninter app almost immediately
 * instead of flashing the browser page. Mirrors tryOpenNativeGateApp() in
 * src/lib/gate-deeplink.ts (mobile UA only, stay/native opt-outs, and the
 * same sessionStorage key so the browser_fallback_url reload cannot loop).
 * Verified Android App Links never reach this page — the OS intercepts them.
 */
const GATE_HANDOFF_SCRIPT = `(function(){try{
var ua=navigator.userAgent||'';
if(!/Android|iPhone|iPad|iPod/i.test(ua))return;
if(/[?&](stay|native)=1/.test(location.search))return;
var m=location.pathname.match(/\\/gate\\/([^/?#]+)/i);
if(!m||!m[1]||m[1]==='_')return;
var id=decodeURIComponent(m[1]);
var key='conninter.gate.appPrompt.'+id;
try{if(sessionStorage.getItem(key)==='1')return;sessionStorage.setItem(key,'1');}catch(e){}
var web=location.origin+'/gate/'+encodeURIComponent(id)+'/';
var link=/iPhone|iPad|iPod/i.test(ua)
?'conninter://gate/'+encodeURIComponent(id)
:'intent://gate/'+encodeURIComponent(id)+'#Intent;scheme=conninter;package=com.conninter.hvts;S.browser_fallback_url='+encodeURIComponent(web)+';end';
location.replace(link);
}catch(e){}})();`;

export default function HospitalGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: GATE_HANDOFF_SCRIPT }} />
      {children}
    </>
  );
}
