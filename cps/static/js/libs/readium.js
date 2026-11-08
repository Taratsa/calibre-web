var Readium=(function(ut){"use strict";let hr=class{close(){}links(){return[]}get(t){throw Error("This is an empty fetcher")}},cr=class{constructor(t,e){this.client=t||window.fetch.bind(window),this.baseUrl=e}links(){return[]}get(t){const e=t.toURL(this.baseUrl);if(e===void 0)throw Error(`Invalid HREF: ${t.href}`);return new dr(this.client,t,e)}close(){}},dr=class{constructor(t,e,i){this.client=t||window.fetch.bind(window),this._link=e,this.url=i}async headResponse(){if(this._headResponse)return this._headResponse;const t=await this.client(this.url,{method:"HEAD"});if(!t.ok)throw new Error(`http HEAD request for ${this.url} failed with HTTP status code ${t.status}`);return this._headResponse=t,t}close(){}async link(){return this._link}async read(t,e){if(t)throw new Error("http read range not implemented!");const i=await this.client(this.url,e?.signal?{signal:e.signal}:void 0);if(!i.ok)throw new Error(`http GET request for ${this.url} failed with HTTP status code ${i.status}`);return new Uint8Array(await i.arrayBuffer())}async length(){const t=(await this.headResponse()).headers.get("content-length");if(t===null||t==="")throw new Error("length for resource unavailable");return parseInt(t)}async readAsJSON(){const t=await this.client(this.url);if(!t.ok)throw new Error(`http GET request for ${this.url} failed with HTTP status code ${t.status}`);return await t.json()}async readAsString(){const t=await this.client(this.url);if(!t.ok)throw new Error(`http GET request for ${this.url} failed with HTTP status code ${t.status}`);return await t.text()}async readAsXML(){const t=await this.client(this.url);if(!t.ok)throw new Error(`http GET request for ${this.url} failed with HTTP status code ${t.status}`);return new DOMParser().parseFromString(await t.text(),this._link.mediaType.isHTML?this._link.mediaType.essence:"text/xml")}};function Ti(r){return r&&Array.isArray(r)?r:void 0}function it(r){return r&&typeof r=="string"?[r]:Ti(r)}function Oi(r){return typeof r=="string"?new Date(r):void 0}function Xt(r){return isNaN(r)?void 0:r}function at(r){return Xt(r)!==void 0&&Math.sign(r)>=0?r:void 0}function se(r){const t=new Array;return r.forEach(e=>t.push(e)),t}let ur=class Gn{constructor(t={}){this.conformsTo=t.conformsTo??[],this.certification=t.certification??null,this.summary=t.summary??null,this.accessMode=t.accessMode??[],this.accessModeSufficient=t.accessModeSufficient??[],this.feature=t.feature??[],this.hazard=t.hazard??[],this.exemption=t.exemption??[]}static deserialize(t){if(!t||typeof t!="object")return;const e=t,i=it(e.conformsTo),o=it(e.accessMode),n=Ti(e.accessModeSufficient),s=it(e.feature),a=it(e.hazard),h=it(e.exemption);return new Gn({conformsTo:i?i.map(l=>mr.deserialize(l)).filter(l=>l!==void 0):void 0,certification:e.certification?pr.deserialize(e.certification):void 0,summary:e.summary,accessMode:o?o.map(l=>gr.deserialize(l)).filter(l=>l!==void 0):void 0,accessModeSufficient:n?n.map(l=>fr.deserialize(l)).filter(l=>l!==void 0):void 0,feature:s?s.map(l=>Sr.deserialize(l)).filter(l=>l!==void 0):void 0,hazard:a?a.map(l=>yr.deserialize(l)).filter(l=>l!==void 0):void 0,exemption:h?h.map(l=>_r.deserialize(l)).filter(l=>l!==void 0):void 0})}serialize(){const t={};return this.conformsTo?.length>0&&(t.conformsTo=this.conformsTo.map(e=>e.serialize())),this.certification!==void 0&&this.certification!==null&&(t.certification=this.certification.serialize()),this.summary!==void 0&&this.summary!==null&&(t.summary=this.summary),this.accessMode?.length>0&&(t.accessMode=this.accessMode.map(e=>e.serialize())),this.accessModeSufficient?.length>0&&(t.accessModeSufficient=this.accessModeSufficient.map(e=>e.serialize())),this.feature?.length>0&&(t.feature=this.feature.map(e=>e.serialize())),this.hazard?.length>0&&(t.hazard=this.hazard.map(e=>e.serialize())),this.exemption?.length>0&&(t.exemption=this.exemption.map(e=>e.serialize())),t}};const z=class J{constructor(t){this.uri=t}static deserialize(t){if(!(!t||typeof t!="string"))return new J(t)}serialize(){return this.uri}get isWCAGLevelA(){return this===J.EPUB_A11Y_10_WCAG_20_A||this===J.EPUB_A11Y_11_WCAG_20_A||this===J.EPUB_A11Y_11_WCAG_21_A||this===J.EPUB_A11Y_11_WCAG_22_A}get isWCAGLevelAA(){return this===J.EPUB_A11Y_10_WCAG_20_AA||this===J.EPUB_A11Y_11_WCAG_20_AA||this===J.EPUB_A11Y_11_WCAG_21_AA||this===J.EPUB_A11Y_11_WCAG_22_AA}get isWCAGLevelAAA(){return this===J.EPUB_A11Y_10_WCAG_20_AAA||this===J.EPUB_A11Y_11_WCAG_20_AAA||this===J.EPUB_A11Y_11_WCAG_21_AAA||this===J.EPUB_A11Y_11_WCAG_22_AAA}};z.EPUB_A11Y_10_WCAG_20_A=new z("http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-a"),z.EPUB_A11Y_10_WCAG_20_AA=new z("http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aa"),z.EPUB_A11Y_10_WCAG_20_AAA=new z("http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aaa"),z.EPUB_A11Y_11_WCAG_20_A=new z("https://www.w3.org/TR/epub-a11y-11#wcag-2.0-a"),z.EPUB_A11Y_11_WCAG_20_AA=new z("https://www.w3.org/TR/epub-a11y-11#wcag-2.0-aa"),z.EPUB_A11Y_11_WCAG_20_AAA=new z("https://www.w3.org/TR/epub-a11y-11#wcag-2.0-aaa"),z.EPUB_A11Y_11_WCAG_21_A=new z("https://www.w3.org/TR/epub-a11y-11#wcag-2.1-a"),z.EPUB_A11Y_11_WCAG_21_AA=new z("https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aa"),z.EPUB_A11Y_11_WCAG_21_AAA=new z("https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aaa"),z.EPUB_A11Y_11_WCAG_22_A=new z("https://www.w3.org/TR/epub-a11y-11#wcag-2.2-a"),z.EPUB_A11Y_11_WCAG_22_AA=new z("https://www.w3.org/TR/epub-a11y-11#wcag-2.2-aa"),z.EPUB_A11Y_11_WCAG_22_AAA=new z("https://www.w3.org/TR/epub-a11y-11#wcag-2.2-aaa");let mr=z,pr=class Vn{constructor(t=null,e=null,i=null){this.certifiedBy=t,this.credential=e,this.report=i}static deserialize(t){if(!(!t||typeof t!="object"))return new Vn(t.certifiedBy,t.credential,t.report)}serialize(){const t={};return this.certifiedBy&&(t.certifiedBy=this.certifiedBy),this.credential&&(t.credential=this.credential),this.report&&(t.report=this.report),t}};const T=class Xn{constructor(t){this.value=t}static deserialize(t){if(!(!t||typeof t!="string"))return new Xn(t)}serialize(){return this.value}};T.AUDITORY=new T("auditory"),T.CHART_ON_VISUAL=new T("chartOnVisual"),T.CHEM_ON_VISUAL=new T("chemOnVisual"),T.COLOR_DEPENDENT=new T("colorDependent"),T.DIAGRAM_ON_VISUAL=new T("diagramOnVisual"),T.MATH_ON_VISUAL=new T("mathOnVisual"),T.MUSIC_ON_VISUAL=new T("musicOnVisual"),T.TACTILE=new T("tactile"),T.TEXT_ON_VISUAL=new T("textOnVisual"),T.TEXTUAL=new T("textual"),T.VISUAL=new T("visual");let gr=T;const lt=class Ct{constructor(t){if(typeof t=="string"){if(!Ct.VALID_MODES.has(t.toLowerCase()))return;this.value=t.toLowerCase()}else{const e=t.filter(i=>Ct.VALID_MODES.has(i.toLowerCase()));if(e.length===0)return;this.value=Array.from(new Set(e))}}static deserialize(t){if(!t)return;if(typeof t=="string")return Ct.VALID_MODES.has(t.toLowerCase())?new Ct(t):void 0;if(!Array.isArray(t))return;const e=t.filter(i=>i?Ct.VALID_MODES.has(i.toLowerCase()):!1);if(e.length!==0)return new Ct(e)}serialize(){return this.value}};lt.VALID_MODES=new Set(["auditory","tactile","textual","visual"]),lt.AUDITORY=new lt("auditory"),lt.TACTILE=new lt("tactile"),lt.TEXTUAL=new lt("textual"),lt.VISUAL=new lt("visual");let fr=lt;const b=class Kn{constructor(t){this.value=t}static deserialize(t){if(!(!t||typeof t!="string"))return new Kn(t)}serialize(){return this.value}};b.NONE=new b("none"),b.ANNOTATIONS=new b("annotations"),b.ARIA=new b("ARIA"),b.INDEX=new b("index"),b.PAGE_BREAK_MARKERS=new b("pageBreakMarkers"),b.PAGE_NAVIGATION=new b("pageNavigation"),b.PRINT_PAGE_NUMBERS=new b("printPageNumbers"),b.READING_ORDER=new b("readingOrder"),b.STRUCTURAL_NAVIGATION=new b("structuralNavigation"),b.TABLE_OF_CONTENTS=new b("tableOfContents"),b.TAGGED_PDF=new b("taggedPDF"),b.ALTERNATIVE_TEXT=new b("alternativeText"),b.AUDIO_DESCRIPTION=new b("audioDescription"),b.CAPTIONS=new b("captions"),b.CLOSED_CAPTIONS=new b("closedCaptions"),b.DESCRIBED_MATH=new b("describedMath"),b.LONG_DESCRIPTION=new b("longDescription"),b.OPEN_CAPTIONS=new b("openCaptions"),b.SIGN_LANGUAGE=new b("signLanguage"),b.TRANSCRIPT=new b("transcript"),b.DISPLAY_TRANSFORMABILITY=new b("displayTransformability"),b.SYNCHRONIZED_AUDIO_TEXT=new b("synchronizedAudioText"),b.TIMING_CONTROL=new b("timingControl"),b.UNLOCKED=new b("unlocked"),b.CHEM_ML=new b("ChemML"),b.LATEX=new b("latex"),b.LATEX_CHEMISTRY=new b("latex-chemistry"),b.MATH_ML=new b("MathML"),b.MATH_ML_CHEMISTRY=new b("MathML-chemistry"),b.TTS_MARKUP=new b("ttsMarkup"),b.HIGH_CONTRAST_AUDIO=new b("highContrastAudio"),b.HIGH_CONTRAST_DISPLAY=new b("highContrastDisplay"),b.LARGE_PRINT=new b("largePrint"),b.BRAILLE=new b("braille"),b.TACTILE_GRAPHIC=new b("tactileGraphic"),b.TACTILE_OBJECT=new b("tactileObject"),b.FULL_RUBY_ANNOTATIONS=new b("fullRubyAnnotations"),b.HORIZONTAL_WRITING=new b("horizontalWriting"),b.RUBY_ANNOTATIONS=new b("rubyAnnotations"),b.VERTICAL_WRITING=new b("verticalWriting"),b.WITH_ADDITIONAL_WORD_SEGMENTATION=new b("withAdditionalWordSegmentation"),b.WITHOUT_ADDITIONAL_WORD_SEGMENTATION=new b("withoutAdditionalWordSegmentation");let Sr=b;const O=class Yn{constructor(t){this.value=t}static deserialize(t){if(!(!t||typeof t!="string"))return new Yn(t)}serialize(){return this.value}};O.FLASHING=new O("flashing"),O.NO_FLASHING_HAZARD=new O("noFlashingHazard"),O.UNKNOWN_FLASHING_HAZARD=new O("unknownFlashingHazard"),O.MOTION_SIMULATION=new O("motionSimulation"),O.NO_MOTION_SIMULATION_HAZARD=new O("noMotionSimulationHazard"),O.UNKNOWN_MOTION_SIMULATION_HAZARD=new O("unknownMotionSimulationHazard"),O.SOUND=new O("sound"),O.NO_SOUND_HAZARD=new O("noSoundHazard"),O.UNKNOWN_SOUND_HAZARD=new O("unknownSoundHazard"),O.UNKNOWN=new O("unknown"),O.NONE=new O("none");let yr=O;const L=class qn{constructor(t){this.value=t}static deserialize(t){if(!(!t||typeof t!="string"))return new qn(t)}serialize(){return this.value}};L.NONE=new L("none"),L.DOCUMENTED=new L("documented"),L.LEGAL=new L("legal"),L.TEMPORARY=new L("temporary"),L.TECHNICAL=new L("technical"),L.EAA_DISPROPORTIONATE_BURDEN=new L("eaa-disproportionate-burden"),L.EAA_FUNDAMENTAL_ALTERATION=new L("eaa-fundamental-alteration"),L.EAA_MICROENTERPRISE=new L("eaa-microenterprise"),L.EAA_TECHNICAL_IMPOSSIBILITY=new L("eaa-technical-impossibility"),L.EAA_TEMPORARY=new L("eaa-temporary");let _r=L;var w=(r=>(r.reflowable="reflowable",r.fixed="fixed",r.scrolled="scrolled",r))(w||{});let Mi=class Zn{constructor(t){this.cssSelector=t.cssSelector,this.textNodeIndex=t.textNodeIndex,this.charOffset=t.charOffset}static deserialize(t){if(!(t&&t.cssSelector))return;let e=at(t.textNodeIndex);if(e===void 0)return;let i=at(t.charOffset);return i===void 0&&(i=at(t.offset)),new Zn({cssSelector:t.cssSelector,textNodeIndex:e,charOffset:i})}serialize(){const t={cssSelector:this.cssSelector,textNodeIndex:this.textNodeIndex};return this.charOffset!==void 0&&(t.charOffset=this.charOffset),t}},br=class Jn{constructor(t){this.start=t.start,this.end=t.end}static deserialize(t){if(!t)return;let e=Mi.deserialize(t.start);if(e)return new Jn({start:e,end:Mi.deserialize(t.end)})}serialize(){const t={start:this.start.serialize()};return this.end&&(t.end=this.end.serialize()),t}};function ae(r){const t=r.split(",")[0].trim(),e=(t.toLowerCase().startsWith("npt:")?t.slice(4):t).split(":");if(e.length===1){const i=parseFloat(e[0]);return isNaN(i)?void 0:i}if(e.length===2){const i=parseInt(e[0],10),o=parseFloat(e[1]);return isNaN(i)||isNaN(o)?void 0:i*60+o}if(e.length===3){const i=parseInt(e[0],10),o=parseInt(e[1],10),n=parseFloat(e[2]);return isNaN(i)||isNaN(o)||isNaN(n)?void 0:i*3600+o*60+n}}function vr(r){const t=ae(r);return t!==void 0&&t===0}function wr(r){const t=Math.floor(r),e=Math.floor(t/3600),i=Math.floor(t%3600/60),o=t%60,n=String(i).padStart(2,"0"),s=String(o).padStart(2,"0");return e>0?`${e}:${n}:${s}`:`${i}:${s}`}let le=null,Te=null,Kt=0;const Ft={r:255,g:255,b:255,a:1},xt=new Map,Rr=()=>{if(!le)if(typeof OffscreenCanvas<"u")le=new OffscreenCanvas(5,5),Te=le.getContext("2d",{willReadFrequently:!0,desynchronized:!0});else{const r=document.createElement("canvas");r.width=5,r.height=5,le=r,Te=r.getContext("2d",{willReadFrequently:!0,desynchronized:!0})}return Te},Cr=r=>{if(!r)return!0;const t=r.trim().toLowerCase();return t.startsWith("var(")||["transparent","currentcolor","inherit","initial","revert","unset","revert-layer"].includes(t)?!0:["linear-gradient","radial-gradient","conic-gradient","repeating-linear-gradient","repeating-radial-gradient","repeating-conic-gradient"].some(e=>t.includes(e))},he=(r,t)=>{console.warn(`[@readium/helpers] Could not parse color: "${r}". ${t} Falling back to ${JSON.stringify(Ft)} to compute contrast. Please use a CSS color value that can be computed to RGB(A).`)},vt=(r,t=null)=>{const e=t?`${r}|${t}`:r,i=xt.get(e);if(i!==void 0)return i??Ft;if(Cr(r))return he(r,"Unsupported color format or special value."),xt.set(e,null),Ft;const o=Rr();if(!o)return he(r,"Could not get canvas context."),xt.set(e,null),Ft;try{Kt===0&&o.clearRect(0,0,5,5);const n=Kt%5,s=Math.floor(Kt/5);o.clearRect(n,s,1,1),t&&(o.fillStyle=t,o.fillRect(n,s,1,1)),o.fillStyle=r,o.fillRect(n,s,1,1);const a=o.getImageData(n,s,1,1);Kt=(Kt+1)%25;const[h,l,c,d]=a.data;if(d===0)return he(r,"Fully transparent color."),xt.set(e,null),Ft;const u={r:h,g:l,b:c,a:d/255};return xt.set(e,u),u}catch(n){return he(r,`Error: ${n instanceof Error?n.message:String(n)}`),xt.set(e,null),Ft}},Oe=r=>{const t=r/255;return t<=.03928?t/12.92:Math.pow((t+.055)/1.055,2.4)},Me=r=>{const t=Oe(r.r),e=Oe(r.g),i=Oe(r.b);return .2126*t+.7152*e+.0722*i},ce=(r,t)=>{const e=typeof r=="string"?vt(r):r,i=typeof t=="string"?vt(t):t,o=Me(e),n=Me(i),s=Math.max(o,n),a=Math.min(o,n);return(s+.05)/(a+.05)},Ni=(r,t=null)=>{const e=vt(r,t),i=ce(e,{r:255,g:255,b:255,a:1}),o=ce(e,{r:0,g:0,b:0,a:1});return i>o},Li=(r,t=null)=>Ni(r,t)?"white":"black",Er=r=>{const t=r.a!==void 0?r.a:1;return`rgba(${Math.round(r.r)}, ${Math.round(r.g)}, ${Math.round(r.b)}, ${t})`},Pr=(r,t)=>({r:Math.min(255,r.r+(255-r.r)*t),g:Math.min(255,r.g+(255-r.g)*t),b:Math.min(255,r.b+(255-r.b)*t),a:r.a??1}),Fr=(r,t)=>({r:Math.max(0,r.r*(1-t)),g:Math.max(0,r.g*(1-t)),b:Math.max(0,r.b*(1-t)),a:r.a??1}),wt=(r,t=null,e=3)=>{const i=vt(r),o=t?vt(t):{r:255,g:255,b:255,a:1};let n=ce(i,o);if(n>=e)return r;const s=Me(o)<.5;let a={...i,a:i.a??1};const h=20,l=.1;for(let c=0;c<h&&(s?a=Pr(a,l):a=Fr(a,l),n=ce(a,o),!(n>=e));c++);return Er(a)};function de(r){return r.replace(/(?:%[0-9A-Fa-f]{2})+/g,t=>{try{return decodeURIComponent(t)}catch{return t}})}const Ui=()=>typeof navigator>"u"?"":navigator.userAgent||"",Ai=()=>typeof navigator>"u"?void 0:navigator.userAgentData||void 0;let Hi=class{constructor(){const t=Ai(),e=Ui(),i=n=>(typeof n=="string"||typeof n=="number")&&n?String(n).replace(/_/g,".").split(".").map(s=>parseInt(s)||0):[],o=(n="")=>{if(!n)return[];const s=new RegExp("^.*"+n+"[ :\\/]?(\\d+([\\._]\\d+)*).*$");return s.test(e)?i(e.replace(s,"$1")):[]};this.OS=(n=>(/(macOS|Mac OS X)/.test(e)?(/\(iP(hone|od touch);/.test(e)&&(n.iOS=o("CPU (?:iPhone )?OS ")),/\(iPad;/.test(e)?n.iOS=n.iPadOS=o("CPU (?:iPhone )?OS "):/(macOS|Mac OS X) \d/.test(e)&&(document.ontouchend!==void 0?n.iOS=n.iPadOS=o():n.macOS=o("(?:macOS|Mac OS X) "))):/Windows( NT)? \d/.test(e)?n.Windows=(s=>s[0]!==6||!s[1]?s:s[1]===1?[7]:s[1]===2?[8]:[8,1])(o("Windows(?: NT)?")):/Android \d/.test(e)?n.Android=o("Android"):/CrOS/.test(e)?n.ChromeOS=o():/X11;/.test(e)&&(n.Linux=o()),n))({}),t&&t.getHighEntropyValues(["architecture","model","platform","platformVersion","uaFullVersion"]).then(n=>(s=>{const a=n.platform,h=n.platformVersion;if(!(!a||!h)){if(/^i(OS|P(hone|od touch))$/.test(a))s.iOS=i(h);else if(/^iPad(OS)?$/.test(a))s.iOS=s.iPadOS=i(h);else if(/^(macOS|(Mac )?OS X|Mac(Intel)?)$/.test(a))document.ontouchend!==void 0?s.iOS=s.iPadOS=i():s.macOS=i(h);else if(/^(Microsoft )?Windows$/.test(a))s.Windows=i(h);else if(/^(Google )?Android$/.test(a))s.Android=i(h);else if(/^((Google )?Chrome OS|CrOS)$/.test(a))s.ChromeOS=i(h);else if(/^(Linux|Ubuntu|X11)$/.test(a))s.Linux=i(h);else return;Object.keys(this.OS).forEach(l=>delete this.OS[l]),Object.assign(this.OS,s)}})({})),this.UA=(n=>{let s=!1;if(t&&Array.isArray(t.brands)){const a=t.brands.reduce((h,l)=>(h[l.brand]=[l.version*1],h),{});a["Google Chrome"]?(s=!0,n.Blink=n.Chromium=a.Chromium||[],n.Chrome=a["Google Chrome"]):a["Microsoft Edge"]?(s=!0,n.Blink=n.Chromium=a.Chromium||[],n.Edge=a["Microsoft Edge"]):a.Opera&&(s=!0,n.Blink=n.Chromium=a.Chromium||[],n.Opera=a.Opera)}return s||(/ Gecko\/\d/.test(e)?(n.Gecko=o("rv"),/ Waterfox\/\d/.test(e)?n.Waterfox=o("Waterfox"):/ Firefox\/\d/.test(e)&&(n.Firefox=o("Firefox"))):/ Edge\/\d/.test(e)?(n.EdgeHTML=o("Edge"),n.Edge=n.EdgeHTML):/ Chrom(ium|e)\/\d/.test(e)?(n.Blink=n.Chromium=(a=>a[0]?a:o("Chrome"))(o("Chromium")),/ EdgA?\/\d/.test(e)?n.Edge=(a=>a[0]?a:o("Edg"))(o("EdgA")):/ OPR\/\d/.test(e)?n.Opera=o("OPR"):/ Vivaldi\/\d/.test(e)?n.Vivaldi=o("Vivaldi"):/ Silk\/\d/.test(e)?n.Silk=o("Silk"):/ UCBrowser\/\d/.test(e)?n.UCBrowser=o("UCBrowser"):/ Phoebe\/\d/.test(e)?n.Phoebe=o("Phoebe"):n.Chrome=(a=>a[0]?a:n.Chromium)(o("Chrome"))):/ AppleWebKit\/\d/.test(e)?(n.WebKit=o("AppleWebKit"),/ CriOS \d/.test(e)?n.Chrome=o("CriOS"):/ FxiOS \d/.test(e)?n.Firefox=o("FxiOS"):/ EdgiOS\/\d/.test(e)?n.Edge=o("EdgiOS"):/ Version\/\d/.test(e)&&(n.Safari=o("Version"))):/ Trident\/\d/.test(e)&&(n.Trident=o("Trident"),n.InternetExplorer=(a=>a[0]?a:o("MSIE"))(o("rv")))),/[\[; ]FB(AN|_IAB)\//.test(e)&&(n.Facebook=o("FBAV")),/ Line\/\d/.test(e)&&(n.LINE=o("Line")),n})({}),this.Env={get:()=>[this.OS,this.UA].reduce((n,s)=>{for(const a in s)s[a]&&n.push(a);return n},[])}}},xr=class extends Hi{get iOSRequest(){const t=Ai(),e=Ui();if(this.OS.iOS&&!this.OS.iPadOS)return"mobile";if(this.OS.iPadOS)return/\(iPad;/.test(e)||t&&/^iPad(OS)?$/.test(t.platform)?"mobile":"desktop"}};const X=new Hi,ht=new xr,Ii=":~:text=";function kr(r){if(!r)return;const t=r.indexOf(Ii);if(t===-1)return;const e=r.slice(t+Ii.length).split("&")[0];if(e)try{let i=e.split(",");const o={textStart:""};return i.length>1&&i[0].endsWith("-")&&(o.prefix=decodeURIComponent(i[0].slice(0,-1)),i=i.slice(1)),i.length>1&&i[i.length-1].startsWith("-")&&(o.suffix=decodeURIComponent(i[i.length-1].slice(1)),i=i.slice(0,-1)),i.length===0||i[0]===""?void 0:(o.textStart=decodeURIComponent(i[0]),i.length>1&&(o.textEnd=decodeURIComponent(i[1])),o)}catch{return}}const zr=["ADDRESS","ARTICLE","ASIDE","BLOCKQUOTE","BR","DETAILS","DIALOG","DD","DIV","DL","DT","FIELDSET","FIGCAPTION","FIGURE","FOOTER","FORM","H1","H2","H3","H4","H5","H6","HEADER","HGROUP","HR","LI","MAIN","NAV","OL","P","PRE","SECTION","TABLE","UL","TR","TH","TD","COLGROUP","COL","CAPTION","THEAD","TBODY","TFOOT"],ue=/[\t-\r -#%-\*,-\/:;\?@\[-\]_\{\}\x85\xA0\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u1680\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2000-\u200A\u2010-\u2029\u202F-\u2043\u2045-\u2051\u2053-\u205F\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E44\u3000-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC9\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDF3C-\uDF3E]|\uD807[\uDC41-\uDC45\uDC70\uDC71]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/u,Tr=(r,t,e)=>{const i=[],o=t.createRange();for(o.selectNodeContents(e??t);!o.collapsed&&i.length<2;){let n;if(r.prefix){const s=Yt(r.prefix,o);if(s==null)break;me(o,s.startContainer,s.startOffset);const a=t.createRange();if(a.setStart(s.endContainer,s.endOffset),a.setEnd(o.endContainer,o.endOffset),$i(a),a.collapsed||(n=Yt(r.textStart,a),n==null))break;if(n.compareBoundaryPoints(Range.START_TO_START,a)!==0)continue}else{if(n=Yt(r.textStart,o),n==null)break;me(o,n.startContainer,n.startOffset)}if(r.textEnd){const s=t.createRange();s.setStart(n.endContainer,n.endOffset),s.setEnd(o.endContainer,o.endOffset);let a=!1;for(;!s.collapsed&&i.length<2;){const h=Yt(r.textEnd,s);if(h==null)break;if(me(s,h.startContainer,h.startOffset),n.setEnd(h.endContainer,h.endOffset),r.suffix){const l=Di(r.suffix,n,o,t);if(l===mt.NO_SUFFIX_MATCH)break;if(l===mt.SUFFIX_MATCH){a=!0,i.push(n.cloneRange());continue}else if(l===mt.MISPLACED_SUFFIX)continue}else a=!0,i.push(n.cloneRange())}if(!a)break}else if(r.suffix){const s=Di(r.suffix,n,o,t);if(s===mt.NO_SUFFIX_MATCH)break;if(s===mt.SUFFIX_MATCH){i.push(n.cloneRange()),me(o,o.startContainer,o.startOffset);continue}else if(s===mt.MISPLACED_SUFFIX)continue}else i.push(n.cloneRange())}return i},mt={NO_SUFFIX_MATCH:0,SUFFIX_MATCH:1,MISPLACED_SUFFIX:2},Di=(r,t,e,i)=>{const o=i.createRange();o.setStart(t.endContainer,t.endOffset),o.setEnd(e.endContainer,e.endOffset),$i(o);const n=Yt(r,o);return n==null?mt.NO_SUFFIX_MATCH:n.compareBoundaryPoints(Range.START_TO_START,o)!==0?mt.MISPLACED_SUFFIX:mt.SUFFIX_MATCH},me=(r,t,e)=>{try{r.setStart(t,e+1)}catch{r.setStartAfter(t)}},$i=r=>{const t=Or(r);let e=t.nextNode();for(;!r.collapsed&&e!=null;){if(e!==r.startContainer&&r.setStart(e,0),e.textContent.length>r.startOffset&&!e.textContent[r.startOffset].match(/\s/))return;try{r.setStart(e,r.startOffset+1)}catch{e=t.nextNode(),e==null?r.collapse():r.setStart(e,0)}}},Or=r=>(r.commonAncestorContainer.ownerDocument??r.commonAncestorContainer).createTreeWalker(r.commonAncestorContainer,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,{acceptNode:t=>Lr(t,r)}),Mr=r=>{if(r.hidden==="until-found")return!0;const t=r.attributes;return!!(t&&t.hidden&&t.hidden.value==="until-found")},Wi=r=>{let t=r;for(;t!=null&&t.nodeType!==Node.ELEMENT_NODE;)t=t.parentNode;const e=t,i=e?.ownerDocument?.defaultView;if(e!=null&&i!=null){if(Mr(e))return!0;const o=i.getComputedStyle(e);if(o.visibility==="hidden"||o.display==="none"||parseInt(o.height,10)===0&&o.overflowY!="visible"||parseInt(o.width,10)===0&&o.overflowX!="visible"||parseInt(o.opacity,10)===0)return!1}return!0},Nr=(r,t)=>t!=null&&!t.intersectsNode(r)?NodeFilter.FILTER_REJECT:Wi(r)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT,Lr=(r,t)=>t!=null&&!t.intersectsNode(r)||!Wi(r)?NodeFilter.FILTER_REJECT:r.nodeType===Node.TEXT_NODE?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP,Ur=(r,t)=>{const e=[];let i=[];const o=Array.from(Hr(r,n=>Nr(n,t)));for(const n of o)n.nodeType===Node.TEXT_NODE?i.push(n):n.nodeType===Node.ELEMENT_NODE&&zr.includes(n.tagName.toUpperCase())&&i.length>0&&(e.push(i),i=[]);return i.length>0&&e.push(i),e},Ar=(r,t,e)=>{let i="";return r.length===1?i=r[0].textContent.substring(t,e):i=r[0].textContent.substring(t)+r.slice(1,-1).reduce((o,n)=>o+n.textContent,"")+r.slice(-1)[0].textContent.substring(0,e),i.replace(/[\t\n\r ]+/g," ")};function*Hr(r,t){const e=(r.ownerDocument??r).createTreeWalker(r,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:t}),i=new Set;for(;Wr(e,i)!==null;)yield e.currentNode}const Yt=(r,t)=>{const e=Ur(t.commonAncestorContainer,t),i=$r(t.commonAncestorContainer.ownerDocument??void 0);for(const o of e){const n=Ir(r,t,o,i);if(n!==void 0)return n}},Ir=(r,t,e,i)=>{if(!r||!t||!(e||[]).length)return;const o=e[0]===t.startContainer?t.startOffset:0,n=Rt(Ar(e,o,void 0)),s=Rt(r);let a=0,h,l;for(;a<n.length;){const c=n.indexOf(s,a);if(c===-1)return;if(Dr(n,c,s.length,i)){const d=Rt(e[0].data.slice(0,o)).length;h=Bi(d+c,e,!1),l=Bi(d+c+s.length,e,!0)}if(h!=null&&l!=null){const d=new Range;if(d.setStart(h.node,h.offset),d.setEnd(l.node,l.offset),t.compareBoundaryPoints(Range.START_TO_START,d)<=0&&t.compareBoundaryPoints(Range.END_TO_END,d)>=0)return d}a=c+1}},Bi=(r,t,e)=>{let i=0,o;for(let n=0;n<t.length;n++){const s=t[n];o||(o=Rt(s.data));let a=i+o.length;if(e&&(a+=1),a>r){const h=r-i;let l=Math.min(r-i,s.data.length);const c=e?o.substring(0,h):o.substring(h);let d=Rt(e?s.data.substring(0,l):s.data.substring(l));const u=(e?-1:1)*(c.length>d.length?-1:1);for(;l>=0&&l<=s.data.length;){if(d.length===c.length)return{node:s,offset:l};l+=u,d=Rt(e?s.data.substring(0,l):s.data.substring(l))}}if(i+=o.length,n+1<t.length){const h=Rt(t[n+1].data);o.slice(-1)===" "&&h.slice(0,1)===" "&&(i-=1),o=h}}},Dr=(r,t,e,i)=>{if(t<0||t>=r.length||e<=0||t+e>r.length)return!1;if(i){const o=i.segment(r),n=o.containing(t);if(!n||n.isWordLike&&n.index!=t)return!1;const s=t+e,a=o.containing(s);if(a&&a.isWordLike&&a.index!=s)return!1}else if(r[t].match(ue)&&(++t,--e,!e)||r[t+e-1].match(ue)&&(--e,!e)||t!==0&&!r[t-1].match(ue)||t+e!==r.length&&!r[t+e].match(ue))return!1;return!0},Rt=r=>(r||"").normalize("NFKD").replace(/\s+/g," ").replace(/[\u0300-\u036f]/g,"").toLowerCase(),$r=r=>{if(Intl.Segmenter){const t=r?.documentElement?.lang||r?.defaultView?.navigator?.language||void 0;return new Intl.Segmenter(t,{granularity:"word"})}},Wr=(r,t)=>{if(!t.has(r.currentNode)){const o=r.firstChild();if(o!==null)return o}const e=r.nextSibling();if(e!==null)return e;const i=r.parentNode();return i!==null&&t.add(i),i};function kt(r){return r.otherLocations?.get("cssSelector")}function Br(r){return br.deserialize(r.otherLocations?.get("domRange"))}function jr(r){return r.fragments?.map(t=>kr(t)).find(t=>t)}function ji(r){return new Map(r.fragments?.map(t=>t.startsWith("#")?t.slice(1):t).join("&").split("&").filter(t=>!t.startsWith("#")).map(t=>t.split("=")).filter(t=>t.length===2).map(t=>[t[0].trim().toLowerCase(),t[1].trim()]))}function Gi(r){if(!r.fragments?.length)return;let t=r.fragments.find(i=>i.length&&!i.includes("="));if(!t){const i=ji(r);i.has("id")?t=i.get("id"):i.has("name")&&(t=i.get("name"))}const e=t?.startsWith("#")?t.slice(1):t;return e!==void 0?de(e):void 0}function Gr(r){const t=ji(r).get("t");if(t)return ae(t)}let ct=class _{constructor(t){let e,i,o=t.mediaType.replace(/\s/g,"").split(";");const n=o[0].split("/");if(n.length===2){if(e=n[0].toLowerCase().trim(),i=n[1].toLowerCase().trim(),e.length===0||i.length===0)throw new Error("Invalid media type")}else throw new Error("Invalid media type");const s={};for(let u=1;u<o.length;u++){const m=o[u].split("=");if(m.length===2){const p=m[0].toLocaleLowerCase(),S=p==="charset"?m[1].toUpperCase():m[1];s[p]=S}}const a={},h=Object.keys(s);h.sort((u,m)=>u.localeCompare(m)),h.forEach(u=>a[u]=s[u]);let l="";for(const u in a){const m=a[u];l+=`;${u}=${m}`}const c=`${e}/${i}${l}`,d=a.encoding;this.string=c,this.type=e,this.subtype=i,this.parameters=a,this.encoding=d,this.name=t.name,this.fileExtension=t.fileExtension}static parse(t){return new _(t)}get structuredSyntaxSuffix(){const t=this.subtype.split("+");return t.length>1?`+${t[t.length-1]}`:void 0}get essence(){return`${this.type}/${this.subtype}`}get charset(){return this.parameters.charset}contains(t){const e=typeof t=="string"?_.parse({mediaType:t}):t;if(!((this.type==="*"||this.type===e.type)&&(this.subtype==="*"||this.subtype===e.subtype)))return!1;const i=new Set(Object.entries(this.parameters).map(([n,s])=>`${n}=${s}`)),o=new Set(Object.entries(e.parameters).map(([n,s])=>`${n}=${s}`));for(const n of Array.from(i.values()))if(!o.has(n))return!1;return!0}matches(t){const e=typeof t=="string"?_.parse({mediaType:t}):t;return this.contains(e)||e.contains(this)}matchesAny(...t){for(const e of t)if(this.matches(e))return!0;return!1}equals(t){return this.string===t.string}get isZIP(){return this.matchesAny(_.ZIP,_.LCP_PROTECTED_AUDIOBOOK,_.LCP_PROTECTED_PDF)||this.structuredSyntaxSuffix==="+zip"}get isJSON(){return this.matchesAny(_.JSON)||this.structuredSyntaxSuffix==="+json"}get isOPDS(){return this.matchesAny(_.OPDS1,_.OPDS1_ENTRY,_.OPDS2,_.OPDS2_PUBLICATION,_.OPDS_AUTHENTICATION)||this.structuredSyntaxSuffix==="+json"}get isHTML(){return this.matchesAny(_.HTML,_.XHTML)}get isBitmap(){return this.matchesAny(_.AVIF,_.BMP,_.GIF,_.JPEG,_.PNG,_.TIFF,_.WEBP)}get isAudio(){return this.type==="audio"}get isVideo(){return this.type==="video"}get isRWPM(){return this.matchesAny(_.READIUM_AUDIOBOOK_MANIFEST,_.DIVINA_MANIFEST,_.READIUM_WEBPUB_MANIFEST)}get isPublication(){return this.matchesAny(_.READIUM_AUDIOBOOK,_.READIUM_AUDIOBOOK_MANIFEST,_.CBZ,_.DIVINA,_.DIVINA_MANIFEST,_.EPUB,_.LCP_PROTECTED_AUDIOBOOK,_.LCP_PROTECTED_PDF,_.LPF,_.PDF,_.W3C_WPUB_MANIFEST,_.READIUM_WEBPUB,_.READIUM_WEBPUB_MANIFEST,_.ZAB)}static get AAC(){return _.parse({mediaType:"audio/aac",fileExtension:"aac"})}static get ACSM(){return _.parse({mediaType:"application/vnd.adobe.adept+xml",name:"Adobe Content Server Message",fileExtension:"acsm"})}static get AIFF(){return _.parse({mediaType:"audio/aiff",fileExtension:"aiff"})}static get AVI(){return _.parse({mediaType:"video/x-msvideo",fileExtension:"avi"})}static get AVIF(){return _.parse({mediaType:"image/avif",fileExtension:"avif"})}static get BINARY(){return _.parse({mediaType:"application/octet-stream"})}static get BMP(){return _.parse({mediaType:"image/bmp",fileExtension:"bmp"})}static get CBZ(){return _.parse({mediaType:"application/vnd.comicbook+zip",name:"Comic Book Archive",fileExtension:"cbz"})}static get CSS(){return _.parse({mediaType:"text/css",fileExtension:"css"})}static get DIVINA(){return _.parse({mediaType:"application/divina+zip",name:"Digital Visual Narratives",fileExtension:"divina"})}static get DIVINA_MANIFEST(){return _.parse({mediaType:"application/divina+json",name:"Digital Visual Narratives",fileExtension:"json"})}static get EPUB(){return _.parse({mediaType:"application/epub+zip",name:"EPUB",fileExtension:"epub"})}static get GIF(){return _.parse({mediaType:"image/gif",fileExtension:"gif"})}static get GZ(){return _.parse({mediaType:"application/gzip",fileExtension:"gz"})}static get HTML(){return _.parse({mediaType:"text/html",fileExtension:"html"})}static get JAVASCRIPT(){return _.parse({mediaType:"text/javascript",fileExtension:"js"})}static get JPEG(){return _.parse({mediaType:"image/jpeg",fileExtension:"jpeg"})}static get JSON(){return _.parse({mediaType:"application/json"})}static get LCP_LICENSE_DOCUMENT(){return _.parse({mediaType:"application/vnd.readium.lcp.license.v1.0+json",name:"LCP License",fileExtension:"lcpl"})}static get LCP_PROTECTED_AUDIOBOOK(){return _.parse({mediaType:"application/audiobook+lcp",name:"LCP Protected Audiobook",fileExtension:"lcpa"})}static get LCP_PROTECTED_PDF(){return _.parse({mediaType:"application/pdf+lcp",name:"LCP Protected PDF",fileExtension:"lcpdf"})}static get LCP_STATUS_DOCUMENT(){return _.parse({mediaType:"application/vnd.readium.license.status.v1.0+json"})}static get LPF(){return _.parse({mediaType:"application/lpf+zip",fileExtension:"lpf"})}static get MP3(){return _.parse({mediaType:"audio/mpeg",fileExtension:"mp3"})}static get MPEG(){return _.parse({mediaType:"video/mpeg",fileExtension:"mpeg"})}static get NCX(){return _.parse({mediaType:"application/x-dtbncx+xml",fileExtension:"ncx"})}static get OGG(){return _.parse({mediaType:"audio/ogg",fileExtension:"oga"})}static get OGV(){return _.parse({mediaType:"video/ogg",fileExtension:"ogv"})}static get OPDS1(){return _.parse({mediaType:"application/atom+xml;profile=opds-catalog"})}static get OPDS1_ENTRY(){return _.parse({mediaType:"application/atom+xml;type=entry;profile=opds-catalog"})}static get OPDS2(){return _.parse({mediaType:"application/opds+json"})}static get OPDS2_PUBLICATION(){return _.parse({mediaType:"application/opds-publication+json"})}static get OPDS_AUTHENTICATION(){return _.parse({mediaType:"application/opds-authentication+json"})}static get OPUS(){return _.parse({mediaType:"audio/opus",fileExtension:"opus"})}static get OTF(){return _.parse({mediaType:"font/otf",fileExtension:"otf"})}static get PDF(){return _.parse({mediaType:"application/pdf",name:"PDF",fileExtension:"pdf"})}static get PNG(){return _.parse({mediaType:"image/png",fileExtension:"png"})}static get READIUM_AUDIOBOOK(){return _.parse({mediaType:"application/audiobook+zip",name:"Readium Audiobook",fileExtension:"audiobook"})}static get READIUM_AUDIOBOOK_MANIFEST(){return _.parse({mediaType:"application/audiobook+json",name:"Readium Audiobook",fileExtension:"json"})}static get READIUM_CONTENT_DOCUMENT(){return _.parse({mediaType:"application/vnd.readium.content+json",name:"Readium Content Document",fileExtension:"json"})}static get READIUM_GUIDED_NAVIGATION_DOCUMENT(){return _.parse({mediaType:"application/guided-navigation+json",name:"Readium Guided Navigation Document",fileExtension:"json"})}static get READIUM_POSITION_LIST(){return _.parse({mediaType:"application/vnd.readium.position-list+json",name:"Readium Position List",fileExtension:"json"})}static get READIUM_WEBPUB(){return _.parse({mediaType:"application/webpub+zip",name:"Readium Web Publication",fileExtension:"webpub"})}static get READIUM_WEBPUB_MANIFEST(){return _.parse({mediaType:"application/webpub+json",name:"Readium Web Publication",fileExtension:"json"})}static get SMIL(){return _.parse({mediaType:"application/smil+xml",fileExtension:"smil"})}static get SVG(){return _.parse({mediaType:"image/svg+xml",fileExtension:"svg"})}static get TEXT(){return _.parse({mediaType:"text/plain",fileExtension:"txt"})}static get TIFF(){return _.parse({mediaType:"image/tiff",fileExtension:"tiff"})}static get TTF(){return _.parse({mediaType:"font/ttf",fileExtension:"ttf"})}static get W3C_WPUB_MANIFEST(){return _.parse({mediaType:"application/x.readium.w3c.wpub+json",name:"Web Publication",fileExtension:"json"})}static get WAV(){return _.parse({mediaType:"audio/wav",fileExtension:"wav"})}static get WEBM_AUDIO(){return _.parse({mediaType:"audio/webm",fileExtension:"webm"})}static get WEBM_VIDEO(){return _.parse({mediaType:"video/webm",fileExtension:"webm"})}static get WEBP(){return _.parse({mediaType:"image/webp",fileExtension:"webp"})}static get WOFF(){return _.parse({mediaType:"font/woff",fileExtension:"woff"})}static get WOFF2(){return _.parse({mediaType:"font/woff2",fileExtension:"woff2"})}static get XHTML(){return _.parse({mediaType:"application/xhtml+xml",fileExtension:"xhtml"})}static get XML(){return _.parse({mediaType:"application/xml",fileExtension:"xml"})}static get ZAB(){return _.parse({mediaType:"application/x.readium.zab+zip",name:"Zipped Audio Book",fileExtension:"zab"})}static get ZIP(){return _.parse({mediaType:"application/zip",fileExtension:"zip"})}};var tt=(r=>(r.left="left",r.right="right",r.center="center",r))(tt||{});let Vi=class yi{constructor(t){this.otherProperties=t}get page(){return this.otherProperties.page}static deserialize(t){if(t)return new yi(t)}serialize(){return this.otherProperties}add(t){const e=Object.assign({},this.otherProperties);for(const i in t)e[i]=t[i];return new yi(e)}},Ne=class{constructor(t){this.uri=t,this.parameters=this.getParameters(t)}getParameters(t){const e=/\{\??([^}]+)\}/g,i=t.match(e);return i?new Set(i.join(",").replace(e,"$1").split(",").map(o=>o.trim())):new Set}expand(t){const e=o=>o.split(",").map(n=>{const s=t[n];return s?encodeURIComponent(s):""}).join(","),i=o=>"?"+o.split(",").map(n=>{const s=n.split("=")[0],a=t[s];return a?`${s}=${encodeURIComponent(a)}`:""}).join("&");return this.uri.replace(/\{(\??)([^}]+)\}/g,(...o)=>o[1]?i(o[2]):e(o[2]))}},pt=class Qn{constructor(t){this.fragments=t.fragments?t.fragments:new Array,this.progression=t.progression,this.totalProgression=t.totalProgression,this.position=t.position,this.otherLocations=t.otherLocations}static deserialize(t){if(!t)return;const e=Xt(t.progression),i=Xt(t.totalProgression),o=Xt(t.position),n=new Map,s=new Set(["fragment","fragments","progression","totalProgression","position","otherLocations"]);return Object.entries(t).forEach(([a,h])=>{s.has(a)||n.set(a,h)}),t.otherLocations?.forEach?.((a,h)=>n.set(h,a)),new Qn({fragments:it(t.fragments||t.fragment),progression:e!==void 0&&e>=0&&e<=1?e:void 0,totalProgression:i!==void 0&&i>=0&&i<=1?i:void 0,position:o!==void 0&&o>0?o:void 0,otherLocations:n.size===0?void 0:n})}serialize(){const t={};return this.fragments&&(t.fragments=this.fragments),this.progression!==void 0&&(t.progression=this.progression),this.totalProgression!==void 0&&(t.totalProgression=this.totalProgression),this.position!==void 0&&(t.position=this.position),this.otherLocations&&this.otherLocations.forEach((e,i)=>t[i]=e),t}},zt=class tr{constructor(t){this.after=t.after,this.before=t.before,this.highlight=t.highlight}static deserialize(t){if(t)return new tr({after:t.after,before:t.before,highlight:t.highlight})}serialize(){const t={};return this.after!==void 0&&(t.after=this.after),this.before!==void 0&&(t.before=this.before),this.highlight!==void 0&&(t.highlight=this.highlight),t}},rt=class _i{constructor(t){const e=t.href.indexOf("#"),i=e>=0?t.href.slice(e+1):void 0;this.href=e>=0?t.href.slice(0,e):t.href,this.type=t.type,this.title=t.title;const o=t.locations?.fragments,n=i&&(!o||o.length===0);this.locations=t.locations?n?new pt({...t.locations,fragments:[i]}):t.locations:i?new pt({fragments:[i]}):new pt({}),this.text=t.text}static deserialize(t){if(t&&t.href&&t.type)return new _i({href:t.href,type:t.type,title:t.title,locations:pt.deserialize(t.locations),text:zt.deserialize(t.text)})}serialize(){const t={href:this.href,type:this.type};return this.title!==void 0&&(t.title=this.title),this.locations&&(t.locations=this.locations.serialize()),this.text&&(t.text=this.text.serialize()),t}copyWithLocations(t){return new _i({href:this.href,type:this.type,title:this.title,text:this.text,locations:new pt({...this.locations,...t})})}},gt=class ke{constructor(t){this.href=t.href,this.templated=t.templated,this.type=t.type,this.title=t.title,this.rels=t.rels,this.properties=t.properties,this.height=t.height,this.width=t.width,this.size=t.size,this.duration=t.duration,this.bitrate=t.bitrate,this.languages=t.languages,this.alternates=t.alternates,this.children=t.children}static deserialize(t){if(!(!t||typeof t.href!="string"))return new ke({href:t.href,templated:t.templated,type:t.type,title:t.title,rels:t.rel?Array.isArray(t.rel)?new Set(t.rel):new Set([t.rel]):void 0,properties:Vi.deserialize(t.properties),height:at(t.height),width:at(t.width),size:at(t.size),duration:at(t.duration),bitrate:at(t.bitrate),languages:it(t.language),alternates:ot.deserialize(t.alternate),children:ot.deserialize(t.children)})}serialize(){const t={href:this.href};return this.templated!==void 0&&(t.templated=this.templated),this.type!==void 0&&(t.type=this.type),this.title!==void 0&&(t.title=this.title),this.rels&&(t.rel=se(this.rels)),this.properties&&(t.properties=this.properties.serialize()),this.height!==void 0&&(t.height=this.height),this.width!==void 0&&(t.width=this.width),this.size!==void 0&&(t.size=this.size),this.duration!==void 0&&(t.duration=this.duration),this.bitrate!==void 0&&(t.bitrate=this.bitrate),this.languages&&(t.language=this.languages),this.alternates&&(t.alternate=this.alternates.serialize()),this.children&&(t.children=this.children.serialize()),t}get mediaType(){return this.type!==void 0?ct.parse({mediaType:this.type}):ct.BINARY}toURL(t){const e=this.href.replace(/^(\/)/,"");if(e.length===0)return;let i=t||"/";return i.startsWith("/")&&(i="file://"+i),new URL(e,i).href.replace(/^(file:\/\/)/,"")}get templateParameters(){return this.templated?new Ne(this.href).parameters:new Set}expandTemplate(t){return new ke({href:new Ne(this.href).expand(t),templated:!1})}addProperties(t){const e=ke.deserialize(this.serialize());return e.properties=e.properties?e.properties?.add(t):new Vi(t),e}get locator(){return new rt({href:this.href,type:this.type??"",title:this.title})}},ot=class er{constructor(t){this.items=t}static deserialize(t){if(t&&Array.isArray(t))return new er(t.map(e=>gt.deserialize(e)).filter(e=>e!==void 0))}serialize(){return this.items.map(t=>t.serialize())}findWithRel(t){const e=i=>i.rels&&i.rels.has(t);return this.items.find(e)}filterByRel(t){const e=i=>i.rels&&i.rels.has(t);return this.items.filter(e)}findWithHref(t){const e=i=>i.href===t;return this.items.find(e)}findIndexWithHref(t){const e=i=>i.href===t;return this.items.findIndex(e)}findWithMediaType(t){const e=i=>i.mediaType.matches(t);return this.items.find(e)}filterByMediaType(t){const e=i=>i.mediaType.matches(t);return this.items.filter(e)}filterByMediaTypes(t){const e=i=>{for(const o of t)if(i.mediaType.matches(o))return!0;return!1};return this.items.filter(e)}everyIsAudio(){const t=e=>e.mediaType.isAudio;return this.items.length>0&&this.items.every(t)}everyIsBitmap(){const t=e=>e.mediaType.isBitmap;return this.items.length>0&&this.items.every(t)}everyIsHTML(){const t=e=>e.mediaType.isHTML;return this.items.length>0&&this.items.every(t)}everyIsVideo(){const t=e=>e.mediaType.isVideo;return this.items.length>0&&this.items.every(t)}everyMatchesMediaType(t){return Array.isArray(t)?this.items.length>0&&this.items.every(e=>{for(const i of t)return e.mediaType.matches(i);return!1}):this.items.length>0&&this.items.every(e=>e.mediaType.matches(t))}filterLinksHasType(){return this.items.filter(t=>t.type)}};var ft=(r=>(r.EPUB="https://readium.org/webpub-manifest/profiles/epub",r.AUDIOBOOK="https://readium.org/webpub-manifest/profiles/audiobook",r.DIVINA="https://readium.org/webpub-manifest/profiles/divina",r.PDF="https://readium.org/webpub-manifest/profiles/pdf",r))(ft||{});let Xi=class A{constructor(t,e,i=[],o=[],n=void 0){this._trimmedLinkMap=new Map,this._allItems=t,this.linkMap=e,this._conformsTo=i,this.tocLinks=o,this._tocDepth=n}static build(t,e={}){const i=t.toc?.items??[],o=t.readingOrder.items,{depth:n}=e,s=t.metadata?.conformsTo??[],a=new Map,h=[];for(let l=0;l<o.length;l++){const c=o[l],d=A.bareHref(c.href),u=c.title??A.findTitleInToc(i,d,n),m=A.collectChildrenFromToc(i,d,n,1,a),p={title:u,references:[c.href],children:m.length>0?m:void 0};a.set(p,c),h.push(p)}return new A(h,a,s,i,n)}augment(t){for(const e of this.flatAll){const i=this.linkFor(e);if(!i)continue;const o=t(e,i);o.position!==void 0&&(e.position=o.position),o.scroll!==void 0&&(e.scroll=o.scroll),o.role!==void 0&&(e.role=o.role)}}get depth(){return this._depth}set depth(t){this._depth!==t&&(this._depth=t,this._tocDepth=t,this._items=void 0,this._flat=void 0,this._toc=void 0)}get items(){return this._items||(this._depth!==void 0?(this._trimmedLinkMap=new Map,this._items=A.trimToDepth(this._allItems,this._depth,this.linkMap,this._trimmedLinkMap)):this._items=this._allItems),this._items}locate(t){const e=t.href.split("#")[0],i=Gr(t.locations),o=Gi(t.locations),n=t.locations.progression;if(i!==void 0){let s=-1/0,a;for(const h of this.flat){if(!this.itemMatchesHref(h,e))continue;const l=this.itemStartTime(h,e);l!==void 0&&l<=i&&l>s&&(s=l,a=h)}if(a)return a}if(o){const s=this.flat.find(a=>this.itemMatchesHref(a,e)?a.references.some(h=>{const l=h.split("#")[1];return l!==void 0&&de(l)===o}):!1);if(s)return s}if(n!==void 0){let s=-1/0,a;for(const l of this.flat){if(!this.itemMatchesHref(l,e))continue;const c=this.itemScrollPosition(l);c!==void 0&&c<=n&&c>s&&(s=c,a=l)}if(a)return a;const h=this.items.find(l=>this.itemMatchesHref(l,e));if(h?.children?.length&&!h.children.some(l=>l.scroll!==void 0)){const l=Math.min(Math.floor(n*h.children.length),h.children.length-1);return h.children[l]}}return this.flat.find(s=>this.itemMatchesHref(s,e))}navigableFrom(t){const e=this.flat.indexOf(t);return{previous:e>0?this.flat[e-1]:void 0,next:e>=0&&e<this.flat.length-1?this.flat[e+1]:void 0}}segmentsForHref(t){const e=t.split("#")[0],i=this.items.find(o=>this.itemMatchesHref(o,e));return i?i.children?.length?i.children:[i]:[]}ancestors(t){return this.ancestorPath(this.items,t)??[]}linkFor(t){return this.linkMap.get(t)??this._trimmedLinkMap.get(t)}get contextualizedToc(){return this._toc||(this._toc=this.tocLinks.length>0?this.buildTocEntries(this.tocLinks,this._tocDepth,1):this._allItems.map(t=>this.entryFor(this.linkFor(t),t))),this._toc}tocEntryFor(t){const e=this.linkFor(t);if(!e)return;const i=this.findTocEntryByLink(this.contextualizedToc,e);return i||this.nearestTocEntryForResource(e.href,t)||this.previousResolvedTocEntry(e)}get flat(){return this._flat||(this._flat=this.flattenItems(this.items)),this._flat}get flatAll(){return this.flattenItems(this._allItems)}static findTitleInToc(t,e,i){const{atStart:o,fragments:n}=A.collectTocCandidates(t,e,i,1);if(o.length>0)return o[0].title;if(n.length===1)return n[0].title}static collectChildrenFromToc(t,e,i,o,n){if(i!==void 0&&o>i)return[];const s=[];for(const a of t){const h=A.bareHref(a.href),l=a.href.startsWith("#");if((h===e||l&&h==="")&&a.title&&!A.isStartOfResource(a.href)){const c=h===""?e+a.href:a.href,d={title:a.title,references:[c]};n.set(d,a),s.push(d)}a.children?.items?.length&&s.push(...A.collectChildrenFromToc(a.children.items,e,i,o+1,n))}return s}static collectTocCandidates(t,e,i,o){if(i!==void 0&&o>i)return{atStart:[],fragments:[]};const n=[],s=[];for(const a of t){const h=A.bareHref(a.href),l=a.href.startsWith("#");if((h===e||l&&h==="")&&a.title&&(A.isStartOfResource(a.href)?n.push(a):s.push(a)),a.children?.items?.length){const c=A.collectTocCandidates(a.children.items,e,i,o+1);n.push(...c.atStart),s.push(...c.fragments)}}return{atStart:n,fragments:s}}static isStartOfResource(t){const e=t.split("#")[1];if(!e)return!0;const i=e.match(/(?:^|&)t=([^&]+)/);return i!==null&&vr(i[1])}get linkToItem(){if(!this._linkToItem){this._linkToItem=new Map;for(const[t,e]of this.linkMap)this._linkToItem.set(e,t)}return this._linkToItem}buildTocEntries(t,e,i){return e!==void 0&&i>e?[]:t.map(o=>{const n=this.linkToItem.get(o)??this.resourceStartItem(o.href),s=o.children?.items?.length?this.buildTocEntries(o.children.items,e,i+1):[];return{...this.entryFor(o,n),children:s.length>0?s:void 0}})}tocLinksFlat(t,e,i){if(e!==void 0&&i>e)return[];const o=[];for(const n of t)o.push(n),n.children?.items?.length&&o.push(...this.tocLinksFlat(n.children.items,e,i+1));return o}entryFor(t,e){const i=this._conformsTo.includes(ft.AUDIOBOOK);return{link:t,position:!i&&e?.position!==void 0?String(e.position):void 0,timestamp:i&&e?.position!==void 0?wr(e.position):void 0}}resourceStartItem(t){const e=A.bareHref(t);return this._allItems.find(i=>this.itemMatchesHref(i,e))}findTocEntryByLink(t,e){for(const i of t){if(i.link===e)return i;if(i.children){const o=this.findTocEntryByLink(i.children,e);if(o)return o}}}nearestTocEntryForResource(t,e){const i=A.bareHref(t),o=this.tocLinksFlat(this.tocLinks,this._tocDepth,1).filter(c=>A.bareHref(c.href)===i).map(c=>({link:c,item:this.linkToItem.get(c)??this.resourceStartItem(c.href)}));if(o.length===0)return;const n=this._conformsTo.includes(ft.AUDIOBOOK),s=n?e.position??0:e.scroll??0;let a,h=-1/0;for(const c of o){const d=n?c.item?.position??0:c.item?.scroll??0;d<=s&&d>h&&(h=d,a=c)}const l=a??o[0];return this.findTocEntryByLink(this.contextualizedToc,l.link)}previousResolvedTocEntry(t){const e=this._allItems.findIndex(i=>this.linkFor(i)===t);if(e!==-1)for(let i=e-1;i>=0;i--){const o=this.linkFor(this._allItems[i]);if(!o)continue;const n=A.bareHref(o.href),{atStart:s,fragments:a}=A.collectTocCandidates(this.tocLinks,n,this._tocDepth,1),h=s.filter(u=>A.bareHref(u.href)===n),l=a.filter(u=>A.bareHref(u.href)===n),c=h[0]??(l.length>0?l[l.length-1]:void 0);if(!c)continue;const d=this.findTocEntryByLink(this.contextualizedToc,c);if(d)return d}}static trimToDepth(t,e,i,o){return t.map(n=>{const s={...n,children:e>1&&n.children?.length?A.trimToDepth(n.children,e-1,i,o):void 0},a=i.get(n);return a&&o.set(s,a),s})}flattenItems(t){const e=[];for(const i of t)e.push(i),i.children&&e.push(...this.flattenItems(i.children));return e}itemStartTime(t,e){for(const i of t.references){const o=i.indexOf("#"),n=o>=0?i.slice(0,o):i,s=o>=0?i.slice(o+1):void 0;if((n||e)!==e)continue;if(!s)return 0;const a=s.match(/(?:^|&)t=([^&]+)/);return a?ae(a[1]):void 0}}itemMatchesHref(t,e){return t.references.some(i=>{const o=i.split("#")[0];return o===e||o===""})}ancestorPath(t,e){for(const i of t){if(i===e)return[];if(i.children){const o=this.ancestorPath(i.children,e);if(o!==null)return[i,...o]}}return null}itemScrollPosition(t){return t.scroll}static bareHref(t){return t.split("#")[0]}};function Vr(r,t){return Xi.build(r,t)}function Xr(r,t){const e=Xi.build(r,t),i=r.readingOrder.items;if(!(i.length<=1||i.every(s=>s.duration!==void 0)))return e;let o=0;const n=new Map(i.map(s=>{const a=o;return o+=s.duration??0,[s.href,a]}));return e.augment((s,a)=>{const h=a.href,l=h.indexOf("#"),c=l>=0?h.slice(0,l):h,d=l>=0?h.slice(l+1):void 0,u=n.get(c)??0,m=d?.match(/(?:^|&)t=([^&]+)/),p=m?ae(m[1]):void 0;return{position:u+(p??0)}}),e}function Kr(r,t){return r.metadata?.conformsTo?.includes(ft.AUDIOBOOK)??!1?Xr(r,t):Vr(r,t)}let Le=class bi{constructor(t){this.value=t.value,this.scheme=t.scheme}static deserialize(t){if(t){if(typeof t=="string")return new bi({value:t});if(typeof t=="object"&&t.value)return new bi({value:t.value,scheme:t.scheme})}}serialize(){return this.scheme?{value:this.value,scheme:this.scheme}:this.value}};const Ue=class Wt{constructor(t){this.translations=typeof t=="string"?{[Wt.UNDEFINED_LANGUAGE]:t}:t}static deserialize(t){if(t&&(typeof t=="string"||t.constructor===Object))return new Wt(t)}serialize(){return this.translations}getTranslation(t){return this.translations[t||Wt.UNDEFINED_LANGUAGE]||this.translations[Wt.UNDEFINED_LANGUAGE]||this.translations[Wt.LANGUAGE_EN]||(Object.values(this.translations).length===0?"":Object.values(this.translations)[0])}};Ue.UNDEFINED_LANGUAGE="und",Ue.LANGUAGE_EN="en";let St=Ue,Yr=class vi{constructor(t){this.name=t.name,this.sortAs=t.sortAs,this.identifier=t.identifier,this.altIdentifiers=t.altIdentifiers,this.roles=t.roles,this.links=t.links,this.position=t.position}static deserialize(t){if(t)return typeof t=="string"?new vi({name:St.deserialize(t)}):t.name?new vi({name:St.deserialize(t.name),sortAs:St.deserialize(t.sortAs),identifier:t.identifier,altIdentifiers:t.altIdentifier?Array.isArray(t.altIdentifier)?new Set(t.altIdentifier.map(e=>Le.deserialize(e)).filter(e=>e!==void 0)):new Set([Le.deserialize(t.altIdentifier)].filter(e=>e!==void 0)):void 0,roles:t.role?new Set(it(t.role)):void 0,links:ot.deserialize(t.links),position:Xt(t.position)}):void 0}serialize(){const t={name:this.name.serialize()};return this.sortAs!==void 0&&(t.sortAs=this.sortAs.serialize()),this.identifier!==void 0&&(t.identifier=this.identifier),this.altIdentifiers&&(t.altIdentifier=se(this.altIdentifiers).map(e=>e.serialize())),this.roles&&(t.role=se(this.roles)),this.links&&(t.links=this.links.serialize()),this.position!==void 0&&(t.position=this.position),t}},K=class ir{constructor(t){this.items=t}static deserialize(t){if(!t)return;const e=Array.isArray(t)?t:[t];return new ir(e.map(i=>Yr.deserialize(i)).filter(i=>i!==void 0))}serialize(){return this.items.map(t=>t.serialize())}},Ae=class or{constructor(t){this.items=t&&t.items?t.items:new Map}static deserialize(t){if(!(t&&typeof t=="object"))return;const e=new Map;return Object.entries(t).forEach(([i,o])=>{const n=K.deserialize(o);n&&n.items.length>0&&e.set(i,n)}),new or({items:e})}serialize(){const t={};return this.items.forEach((e,i)=>t[i]=e.serialize()),t}};var M=(r=>(r.ltr="ltr",r.rtl="rtl",r))(M||{});let qr=class wi{constructor(t){this.name=t.name,this.sortAs=t.sortAs,this.code=t.code,this.scheme=t.scheme,this.links=t.links}static deserialize(t){if(t)return typeof t=="string"?new wi({name:St.deserialize(t)}):t.name?new wi({name:St.deserialize(t.name),sortAs:t.sortAs?St.deserialize(t.sortAs):void 0,code:t.code,scheme:t.scheme,links:ot.deserialize(t.links)}):void 0}serialize(){const t={name:this.name.serialize()};return this.sortAs!==void 0&&(t.sortAs=this.sortAs.serialize()),this.code!==void 0&&(t.code=this.code),this.scheme!==void 0&&(t.scheme=this.scheme),this.links&&(t.links=this.links.serialize()),t}},Zr=class nr{constructor(t){this.items=t}static deserialize(t){if(!t)return;const e=Array.isArray(t)?t:[t];return new nr(e.map(i=>qr.deserialize(i)).filter(i=>i!==void 0))}serialize(){return this.items.map(t=>t.serialize())}};var Jr=(r=>(r.all="all",r.none="none",r))(Jr||{});let Qr=class rr{constructor(t){this.reservation=t.reservation,this.policy=t.policy}static deserialize(t){if(t)return new rr({reservation:t.reservation,policy:t.policy})}serialize(){const t={};return this.reservation!==void 0&&(t.reservation=this.reservation),this.policy!==void 0&&(t.policy=this.policy),t}};const Ki=class Ri{constructor(t){this.title=t.title,this.typeUri=t.typeUri,this.conformsTo=t.conformsTo,this.identifier=t.identifier,this.altIdentifier=t.altIdentifier,this.subtitle=t.subtitle,this.sortAs=t.sortAs,this.artists=t.artists,this.authors=t.authors,this.colorists=t.colorists,this.contributors=t.contributors,this.editors=t.editors,this.illustrators=t.illustrators,this.inkers=t.inkers,this.letterers=t.letterers,this.narrators=t.narrators,this.pencilers=t.pencilers,this.translators=t.translators,this.languages=t.languages,this.description=t.description,this.publishers=t.publishers,this.imprints=t.imprints,this.published=t.published,this.modified=t.modified,this.subjects=t.subjects,this.belongsTo=t.belongsTo,this.belongsToCollections=t.belongsToCollections,this.belongsToSeries=t.belongsToSeries,this.belongsToCollections&&this.belongsToCollections.items.length>0&&(this.belongsTo||(this.belongsTo=new Ae),this.belongsTo.items.set("collection",this.belongsToCollections)),this.belongsToSeries&&this.belongsToSeries.items.length>0&&(this.belongsTo||(this.belongsTo=new Ae),this.belongsTo.items.set("series",this.belongsToSeries)),this.layout=t.layout,this.readingProgression=t.readingProgression,this.duration=t.duration,this.numberOfPages=t.numberOfPages,this.accessibility=t.accessibility,this.tdm=t.tdm,this.otherMetadata=t.otherMetadata}static deserialize(t){if(!(t&&t.title))return;const e=St.deserialize(t.title),i=t["@type"],o=it(t.conformsTo),n=t.identifier,s=Le.deserialize(t.altIdentifier),a=St.deserialize(t.subtitle),h=St.deserialize(t.sortAs),l=K.deserialize(t.artist),c=K.deserialize(t.author),d=K.deserialize(t.colorist),u=K.deserialize(t.contributor),m=K.deserialize(t.editor),p=K.deserialize(t.illustrator),S=K.deserialize(t.inker),y=K.deserialize(t.letterer),g=K.deserialize(t.narrator),f=K.deserialize(t.penciler),v=K.deserialize(t.translator),R=it(t.language),E=t.description,P=K.deserialize(t.publisher),F=K.deserialize(t.imprint),x=Oi(t.published),W=Oi(t.modified),I=Zr.deserialize(t.subject),Z=Ae.deserialize(t.belongsTo),yt=ur.deserialize(t.accessibility),Dh=t.layout,$h=t.readingProgression,Wh=at(t.duration),Bh=at(t.numberOfPages),jh=Qr.deserialize(t.tdm);let xe=Object.assign({},t);return Ri.mappedProperties.forEach(Gh=>delete xe[Gh]),Object.keys(xe).length===0&&(xe=void 0),new Ri({title:e,typeUri:i,conformsTo:o,identifier:n,altIdentifier:s,subtitle:a,sortAs:h,artists:l,authors:c,colorists:d,contributors:u,editors:m,illustrators:p,inkers:S,letterers:y,narrators:g,pencilers:f,translators:v,languages:R,description:E,publishers:P,imprints:F,published:x,modified:W,subjects:I,belongsTo:Z,layout:Dh,readingProgression:$h,duration:Wh,numberOfPages:Bh,accessibility:yt,tdm:jh,otherMetadata:xe})}serialize(){const t={title:this.title.serialize()};if(this.typeUri!==void 0&&(t["@type"]=this.typeUri),this.conformsTo&&(t.conformsTo=this.conformsTo),this.identifier!==void 0&&(t.identifier=this.identifier),this.altIdentifier&&(t.altIdentifier=this.altIdentifier.serialize()),this.subtitle&&(t.subtitle=this.subtitle.serialize()),this.sortAs&&(t.sortAs=this.sortAs.serialize()),this.editors&&(t.editor=this.editors.serialize()),this.artists&&(t.artist=this.artists.serialize()),this.authors&&(t.author=this.authors.serialize()),this.colorists&&(t.colorist=this.colorists.serialize()),this.contributors&&(t.contributor=this.contributors.serialize()),this.illustrators&&(t.illustrator=this.illustrators.serialize()),this.letterers&&(t.letterer=this.letterers.serialize()),this.narrators&&(t.narrator=this.narrators.serialize()),this.pencilers&&(t.penciler=this.pencilers.serialize()),this.translators&&(t.translator=this.translators.serialize()),this.inkers&&(t.inker=this.inkers.serialize()),this.languages&&(t.language=this.languages),this.description!==void 0&&(t.description=this.description),this.publishers&&(t.publisher=this.publishers.serialize()),this.imprints&&(t.imprint=this.imprints.serialize()),this.published!==void 0&&(t.published=this.published.toISOString()),this.modified!==void 0&&(t.modified=this.modified.toISOString()),this.subjects&&(t.subject=this.subjects.serialize()),this.belongsTo&&(t.belongsTo=this.belongsTo.serialize()),this.layout&&(t.layout=this.layout),this.readingProgression&&(t.readingProgression=this.readingProgression),this.duration!==void 0&&(t.duration=this.duration),this.numberOfPages!==void 0&&(t.numberOfPages=this.numberOfPages),this.accessibility&&(t.accessibility=this.accessibility.serialize()),this.tdm&&(t.tdm=this.tdm.serialize()),this.otherMetadata){const e=this.otherMetadata;Object.keys(e).forEach(i=>t[i]=e[i])}return t}get effectiveLayout(){if(!this.conformsTo)return null;for(const t of this.conformsTo)switch(t){case ft.EPUB:return this.layout||w.reflowable;case ft.DIVINA:return this.layout===w.reflowable?w.fixed:this.layout||w.fixed;case ft.AUDIOBOOK:case ft.PDF:return null}return null}get effectiveReadingProgression(){if(this.readingProgression)return this.readingProgression;if(this.languages?.length!==1)return M.ltr;const t=this.languages[0].toLowerCase();if(t==="zh-hant"||t==="zh-tw")return M.rtl;switch(t.split("-")[0]){case"ar":return M.rtl;case"fa":return M.rtl;case"he":return M.rtl;default:return M.ltr}}};Ki.mappedProperties=["title","@type","conformsTo","identifier","altIdentifier","subtitle","sortAs","artist","author","colorist","contributor","editor","illustrator","inker","letterer","narrator","penciler","translator","language","description","publisher","imprint","published","modified","subject","belongsTo","layout","readingProgression","duration","numberOfPages","accessibility","tdm"];let ts=Ki,Yi=class Bt{constructor(t){this.metadata=t.metadata,this.links=t.links,this.subcollections=t.subcollections}static deserialize(t){if(!t)return;let e,i,o;if(Array.isArray(t))e=ot.deserialize(t);else if(typeof t=="object")e=ot.deserialize(t.links),i=new Map,t.metadata&&Object.entries(t.metadata).forEach(([n,s])=>{i?.set(n,s)}),o=Bt.deserializeCollections(t);else return;if(!(!e||e.items.length===0))return new Bt({metadata:i?.size?i:void 0,links:e,subcollections:o?.size?o:void 0})}static deserializeCollections(t){if(!t)return;const e=new Map;return Object.entries(t).forEach(([i,o])=>{if(i!=="links"&&i!=="metadata"){const n=Bt.deserialize(o);if(n){const s=new Array;s.push(n),e.set(i,s)}else if(Array.isArray(o)){const s=o.map(a=>Bt.deserialize(a)).filter(a=>a!==void 0);e.set(i,s)}}}),e.size?e:void 0}serialize(){const t={};return this.metadata&&(t.metadata={},this.metadata.forEach((e,i)=>t.metadata[i]=e)),this.links.items.length&&(t.links=this.links.serialize()),Bt.serializeCollection(t,this.subcollections),t}static serializeCollection(t,e){e&&e.size>0&&e.forEach((i,o)=>{i.length===1?t[o]=i[0].serialize():t[o]=i.map(n=>n.serialize())})}},es=class sr{constructor(t){this.context=t.context,this.metadata=t.metadata,this.links=t.links||new ot([]),this.readingOrder=t.readingOrder,this.resources=t.resources,this.toc=t.toc,this.subcollections=t.subcollections}static deserialize(t){if(!t)return;const e=ts.deserialize(t.metadata);if(!e)return;const i=ot.deserialize(t.readingOrder?t.readingOrder:t.spine);if(!i)return;const o=new Set(["@context","metadata","links","readingOrder","spine","resources","toc"]),n={};return Object.keys(t).forEach(s=>{o.has(s)||(n[s]=t[s])}),new sr({context:it(t["@context"]),metadata:e,links:ot.deserialize(t.links),readingOrder:i,resources:ot.deserialize(t.resources),toc:ot.deserialize(t.toc),subcollections:Yi.deserializeCollections(n)})}serialize(){const t={};return this.context!==void 0&&(t["@context"]=this.context),t.metadata=this.metadata.serialize(),this.links&&this.links.items.length>0&&(t.links=this.links.serialize()),t.readingOrder=this.readingOrder.serialize(),this.resources&&(t.resources=this.resources.serialize()),this.toc&&(t.toc=this.toc.serialize()),Yi.serializeCollection(t,this.subcollections),t}linkWithRel(t){const e=new Array;e.push(this.readingOrder),this.resources&&e.push(this.resources),this.links&&e.push(this.links);let i;for(const o of e)if(i=o.findWithRel(t),i!==void 0)return i;return i}linksWithRel(t){const e=[];return e.push(this.readingOrder.filterByRel(t)),this.resources&&e.push(this.resources.filterByRel(t)),this.links&&e.push(this.links.filterByRel(t)),e.reduce((i,o)=>i.concat(o),[])}locatorFromLink(t){const e=t.href.split("#")[0],i=this.linkWithHref(e);if(!i)return;const o=i.type;if(!o)return;const n=t.href.includes("#");return new rt({href:t.href,type:o,title:i.title??t.title,locations:new pt({progression:n?void 0:0})})}linkWithHref(t){const e=a=>{let h;for(const c of a)if(h=c.findWithHref(t),h!==void 0)return h;const l=new Array;return a.forEach(c=>{const d=[];for(const u of c.items)u.alternates&&d.push(u.alternates),u.children&&d.push(u.children);l.push(...d)}),l.length>0&&(h=e(l)),h},i=[];i.push(this.readingOrder),this.resources&&i.push(this.resources),this.links&&i.push(this.links);const o=e(i);if(o!==void 0)return o;const n=t.split(/[#]/);if(n.length<2)return;const s=n[0];return this.linkWithHref(s)}get baseURL(){const t=this.links?.items.find(i=>i.rels&&i.rels.has("self"));if(!t)return;const e=t.href;if(e)try{const i=new URL(e);return i.search="",i.hash="",i.pathname=i.pathname.substring(0,i.pathname.lastIndexOf("/")+1),i.href}catch{return e.split(/[?#]/)[0].replace(/[^/]*$/,"")}}setSelfLink(t){this.links||(this.links=new ot([])),this.links.items=this.links.items.filter(e=>e.rels===void 0||!e.rels?.has("self")),this.links.items.push(new gt({href:t,type:ct.READIUM_WEBPUB_MANIFEST.string,rels:new Set(["self"])}))}},is=class ar{constructor(t){this.guided=t.guided}static deserialize(t){if(!t)return;const e=ns.deserializeArray(t.guided);if(!(!e||e.length===0))return new ar({guided:e})}serialize(){return{guided:this.guided.map(t=>t.serialize())}}},He=class Ci{constructor(t){this.plain=t.plain,this.ssml=t.ssml,this.language=t.language}static deserialize(t){if(t!=null){if(typeof t=="string")return t.length>0?new Ci({plain:t}):void 0;if(t.plain||t.ssml)return new Ci({plain:t.plain,ssml:t.ssml,language:t.language})}}serialize(){const t={};return this.plain!==void 0&&(t.plain=this.plain),this.ssml!==void 0&&(t.ssml=this.ssml),this.language!==void 0&&(t.language=this.language),Object.keys(t).length>0?t:void 0}},os=class Ei{constructor(t){this.audioref=t.audioref,this.imgref=t.imgref,this.textref=t.textref,this.videoref=t.videoref,this.text=t.text}static deserialize(t){if(!t)return;if(typeof t=="string"){const i=He.deserialize(t);return i?new Ei({text:i}):void 0}const e=new Ei({audioref:t.audioref,imgref:t.imgref,textref:t.textref,videoref:t.videoref,text:He.deserialize(t.text)});if(!(e.audioref===void 0&&e.imgref===void 0&&e.textref===void 0&&e.videoref===void 0&&e.text===void 0))return e}serialize(){const t={};this.audioref!==void 0&&(t.audioref=this.audioref),this.imgref!==void 0&&(t.imgref=this.imgref),this.textref!==void 0&&(t.textref=this.textref),this.videoref!==void 0&&(t.videoref=this.videoref);const e=this.text?.serialize();return e!==void 0&&(t.text=e),t}},ns=class ze{constructor(t){this.id=t.id,this.audioref=t.audioref,this.children=t.children,this.imgref=t.imgref,this.role=t.role,this.text=t.text,this.textref=t.textref,this.videoref=t.videoref,this.description=t.description}get plainText(){return this.text?.plain}get ssmlText(){return this.text?.ssml}get textLanguage(){return this.text?.language}static deserialize(t){if(!t)return;const e=ze.deserializeArray(t.children),i=new ze({id:typeof t.id=="string"?t.id:void 0,audioref:t.audioref,children:e&&e.length>0?e:void 0,imgref:t.imgref,role:t.role?new Set(it(t.role)):void 0,text:He.deserialize(t.text),textref:t.textref,videoref:t.videoref,description:os.deserialize(t.description)});if(!(i.audioref===void 0&&i.imgref===void 0&&i.textref===void 0&&i.videoref===void 0&&i.text===void 0&&i.children===void 0))return i}static deserializeArray(t){if(Array.isArray(t))return t.map(e=>ze.deserialize(e)).filter(e=>e!==void 0)}serialize(){const t={};if(this.id!==void 0&&(t.id=this.id),this.audioref!==void 0&&(t.audioref=this.audioref),this.children!==void 0&&(t.children=this.children.map(e=>e.serialize())),this.imgref!==void 0&&(t.imgref=this.imgref),this.role!==void 0&&(t.role=se(this.role)),this.text!==void 0){const e=this.text.serialize();e!==void 0&&(t.text=e)}return this.textref!==void 0&&(t.textref=this.textref),this.videoref!==void 0&&(t.videoref=this.videoref),this.description!==void 0&&(t.description=this.description.serialize()),t}get audioFile(){return this.audioref?.split("#")[0]}get audioTime(){if(this.audioref?.includes("#"))return this.audioref.split("#",2)[1]}get textFile(){return this.textref?.split("#")[0]}get fragmentId(){if(this.textref?.includes("#"))return this.textref.split("#",2)[1]}get clip(){const t=this.audioFile;if(!t)return;const e=this.audioTime,i={audioResource:t,fragmentId:this.fragmentId};if(!e)return i;const o=this.parseTimer(e);return i.start=o[0],i.end=o[1],i}parseTimer(t){if(!t||!t.startsWith("t="))return[void 0,void 0];const e=t.substring(2).split(",").map(i=>parseFloat(i));return e.length===1?[isNaN(e[0])?void 0:e[0],void 0]:e.length>2?[void 0,void 0]:[isNaN(e[0])?void 0:e[0],isNaN(e[1])?void 0:e[1]]}},rs=class{constructor(t){this.fetcher=new hr,this.guides=new Map,t.fetcher&&(this.fetcher=t.fetcher),this.manifest=t.manifest,this.context=t.manifest.context,this.metadata=t.manifest.metadata,this.links=t.manifest.links,this.readingOrder=t.manifest.readingOrder,this.resources=t.manifest.resources,this.toc=t.manifest.toc,this.subcollections=t.manifest.subcollections}get timeline(){return this._timeline||(this._timeline=Kr(this)),this._timeline}get baseURL(){return this.manifest.baseURL}linkWithHref(t){return this.manifest.linkWithHref(t)}linksWithRole(t){const e=this.subcollections?.get(t);return e&&e.length>0?e[0].links:void 0}linksWithRel(t){return this.manifest.linksWithRel(t)}linkWithRel(t){return this.manifest.linkWithRel(t)}getCover(){const t=[this.links,this.resources,this.readingOrder].filter(Boolean);for(const e of t){const i=e.items.find(o=>o.rels?.has("cover"));if(i)return i}for(const e of t){const i=e.items.find(o=>o.mediaType.isBitmap||o.mediaType.matches(ct.SVG));if(i)return i}}async positionsFromManifest(){const t=this.manifest.links?.findWithMediaType("application/vnd.readium.position-list+json");if(t===void 0)return[];const e=await this.get(t).readAsJSON();return e.total?e.positions.map(i=>rt.deserialize(i)).filter(i=>i!==void 0):[]}async guideForLink(t,e){const i=a=>a.alternates?.findWithMediaType("application/guided-navigation+json");let o=i(t);if(!o){const a=this.linkWithHref(t.href);a!==void 0&&(o=i(a))}if(o){const a=await this.fetchGuide(o,t);if(!e?.skipAudio||!a||!Ie(a.guided))return a}const n=this.manifest.links?.findWithMediaType("application/guided-navigation+json");if(!n)return;const s=await this.fetchGuide(n,t);if(!(e?.skipAudio&&s&&Ie(s.guided)))return s}fetchGuide(t,e){const i=t.href;if(t.templated){const n=new Ne(i),s={};return n.parameters.has("ref")&&(s.ref=e.href.split("#")[0]),this.loadGuide(n.expand(s))}let o=this.guides.get(i);return o||(o=this.loadGuide(i),this.guides.set(i,o),o.catch(()=>this.guides.delete(i))),o}async loadGuide(t){const e=await this.get(new gt({href:t})).readAsJSON();return is.deserialize(e)}get(t){return this.fetcher.get(t)}};function Ie(r){return!!r?.some(t=>t.audioref!==void 0||Ie(t.children))}function qi(r){return typeof r=="object"&&r!==null&&r.nodeType===Node.ELEMENT_NODE}const qt={NONE:"",DESCENDANT:" ",CHILD:" > "},U={id:"id",class:"class",tag:"tag",attribute:"attribute",nthchild:"nthchild",nthoftype:"nthoftype"};function ss(r,t){return Object.values(r).includes(t)}const as="CssSelectorGenerator";function pe(r="unknown problem",...t){console.warn(`${as}: ${r}`,...t)}const ls={selectors:[U.id,U.class,U.tag,U.attribute],includeTag:!1,whitelist:[],blacklist:[],combineWithinSelector:!0,combineBetweenSelectors:!0,root:null,maxCombinations:Number.POSITIVE_INFINITY,maxCandidates:Number.POSITIVE_INFINITY,useScope:!1,ignoreGeneratedClassNames:!1};function Zt(r){return!!r}function hs(r){return Array.isArray(r)?r.filter(t=>ss(U,t)):[]}function Zi(r){return r instanceof RegExp}function cs(r){return["string","function"].includes(typeof r)||Zi(r)}function Ji(r){return Array.isArray(r)?r.filter(cs):[]}function ds(r){return r!=null&&typeof r=="object"&&"nodeType"in r&&typeof r.nodeType=="number"}function Qi(r){const t=[Node.DOCUMENT_NODE,Node.DOCUMENT_FRAGMENT_NODE,Node.ELEMENT_NODE];return ds(r)&&t.includes(r.nodeType)}function to(r,t){if(Qi(r))return r.contains(t)||pe("element root mismatch","Provided root does not contain the element. This will most likely result in producing a fallback selector using element's real root node. If you plan to use the selector using provided root (e.g. `root.querySelector`), it will not work as intended."),r;const e=t.getRootNode({composed:!1});return Qi(e)?(e.nodeType!==Node.DOCUMENT_NODE&&pe("shadow root inferred","You did not provide a root and the element is a child of Shadow DOM. This will produce a selector using ShadowRoot as a root. If you plan to use the selector using document as a root (e.g. `document.querySelector`), it will not work as intended."),e):We(t)}function De(r){return typeof r=="number"?r:Number.POSITIVE_INFINITY}function us(r,t={}){const e=Object.assign(Object.assign({},ls),t);return{selectors:hs(e.selectors),whitelist:Ji(e.whitelist),blacklist:Ji(e.blacklist),root:to(e.root,r),combineWithinSelector:Zt(e.combineWithinSelector),combineBetweenSelectors:Zt(e.combineBetweenSelectors),includeTag:Zt(e.includeTag),maxCombinations:De(e.maxCombinations),maxCandidates:De(e.maxCandidates),useScope:Zt(e.useScope),maxResults:De(e.maxResults),ignoreGeneratedClassNames:Zt(e.ignoreGeneratedClassNames)}}function Jt(r=[]){const[t=[],...e]=r;return e.length===0?t:e.reduce((i,o)=>{const n=new Set(o);return i.filter(s=>n.has(s))},t)}function ms(r){return[].concat(...r)}function ps(r){return r.replace(/[|\\{}()[\]^$+?.]/g,"\\$&").replace(/\*/g,".+")}function ge(r){const t=r.map(e=>{if(Zi(e))return i=>e.test(i);if(typeof e=="function")return i=>{const o=e(i);return typeof o!="boolean"?(pe("pattern matcher function invalid","Provided pattern matching function does not return boolean. It's result will be ignored.",e),!1):o};if(typeof e=="string"){const i=new RegExp("^"+ps(e)+"$");return o=>i.test(o)}return pe("pattern matcher invalid","Pattern matching only accepts strings, regular expressions and/or functions. This item is invalid and will be ignored.",e),()=>!1});return e=>t.some(i=>i(e))}function $e(r,t,e){const i=to(e,r[0]).querySelectorAll(t);if(i.length!==r.length)return!1;const o=new Set(i);return r.every(n=>o.has(n))}function eo(r,t){t=t??We(r);const e=[];let i=r;for(;i&&i!==t;)qi(i)&&e.push(i),i=i.parentNode;return e}function gs(r,t){return Jt(r.map(e=>eo(e,t)))}function fs(r){return typeof r=="object"&&r!==null&&"nodeType"in r&&r.nodeType===Node.DOCUMENT_FRAGMENT_NODE&&"host"in r}function We(r){return r.ownerDocument.querySelector(":root")}const io=", ",Ss=new RegExp(["^$","\\s"].join("|")),ys=new RegExp(["^$"].join("|")),oo=[U.nthoftype,U.tag,U.id,U.class,U.attribute,U.nthchild],_s=ge(["class","id","ng-*"]);function bs({name:r}){return`[${r}]`}function vs({name:r,value:t}){return`[${r}='${t}']`}function ws({nodeName:r,nodeValue:t},e){const i=e.tagName.toLowerCase();return["input","option"].includes(i)&&r==="value"||r==="src"&&t?.startsWith("data:")?!1:!_s(r)}function Rs({nodeName:r,nodeValue:t}){return{name:Tt(r),value:Tt(t??void 0)}}function no(r,t){const e=Array.from(r.attributes).filter(i=>ws(i,r)).map(Rs);return[...e.map(bs),...e.map(vs)]}function Cs(r,t){const e=r.map(i=>no(i));return Jt(e)}const Es=/^[a-z_-]{3,}$/i,Ps=/[bcdfghjklmnpqrstvwxyz]{4,}/i;function Fs(r){if(!Es.test(r)||r.includes("_")&&!r.includes("__")||/^(css|sc|jsx|emotion|makeStyles|MuiButton|MuiBox)-/i.test(r))return!1;const t=r.split(new RegExp("--|__|[-]|(?<=[a-z])(?=[A-Z])")).filter(e=>e.length>0);if(t.length===0||t.length===1&&t[0].length<4)return!1;for(const e of t)if(e.length<=2||Ps.test(e))return!1;return!0}function ro(r,t){var e;const i=((e=r.getAttribute("class"))!==null&&e!==void 0?e:"").trim().split(/\s+/).filter(n=>!ys.test(n));let o=i;if(t?.ignoreGeneratedClassNames){const n=ge(t.whitelist);o=i.filter(s=>{const a=`.${Tt(s)}`;return n(a)?!0:Fs(s)})}return o.map(n=>`.${Tt(n)}`)}function xs(r,t){const e=r.map(i=>ro(i,t));return Jt(e)}function so(r,t){var e;const i=(e=r.getAttribute("id"))!==null&&e!==void 0?e:"",o=`#${Tt(i)}`,n=r.getRootNode({composed:!1});return!Ss.test(i)&&$e([r],o,n)?[o]:[]}function ks(r,t){return r.length===0||r.length>1?[]:so(r[0])}function ao(r,t){const e=r.parentNode,i=e&&"children"in e?e.children:null;if(i){for(let o=0;o<i.length;o++)if(i[o]===r)return[`:nth-child(${String(o+1)})`]}return[]}function zs(r,t){return Jt(r.map(e=>ao(e)))}function lo(r,t){return[Tt(r.tagName.toLowerCase())]}function ho(r,t){const e=[...new Set(ms(r.map(i=>lo(i))))];return e.length===0||e.length>1?[]:[e[0]]}function co(r,t){const e=ho([r])[0],i=r.parentNode,o=i&&"children"in i?i:null;if(o){const n=Array.from(o.children).filter(s=>s.tagName.toLowerCase()===e).indexOf(r);if(n>-1)return[`${e}:nth-of-type(${String(n+1)})`]}return[]}function Ts(r,t){return Jt(r.map(e=>co(e)))}function*uo(r=[],{maxResults:t=Number.POSITIVE_INFINITY}={}){let e=0,i=mo(1);for(;i.length<=r.length&&e<t;){e+=1;const o=new Array(i.length);for(let n=0;n<i.length;n++)o[n]=r[i[n]];yield o,i=Ms(i,r.length-1)}}function Os(r=[],{maxResults:t=Number.POSITIVE_INFINITY}={}){return Array.from(uo(r,{maxResults:t}))}function Ms(r=[],t=0){const e=r.length;if(e===0)return r;let i=e-1;for(;i>=0&&r[i]===t-(e-1-i);)i-=1;if(i<0)return mo(e+1);r[i]+=1;for(let o=i+1;o<e;o++)r[o]=r[o-1]+1;return r}function mo(r=1){const t=new Array(r);for(let e=0;e<r;e++)t[e]=e;return t}function*Ns(r={}){const t=Object.entries(r);if(t.length===0)return;const e=[{index:t.length-1,partial:{}}];for(;e.length>0;){const i=e.pop();if(!i)break;const{index:o,partial:n}=i;if(o<0){yield n;continue}const[s,a]=t[o];for(let h=a.length-1;h>=0;h--)e.push({index:o-1,partial:Object.assign(Object.assign({},n),{[s]:a[h]})})}}const Ls="3a".toUpperCase(),Us=/[ !"#$%&'()[\]{|}<>*+,./;=?@^`~\\]/;function Tt(r=""){return CSS?CSS.escape(r):As(r)}function As(r=""){return r.split("").map(t=>t===":"?`\\${Ls} `:Us.test(t)?`\\${t}`:escape(t).replace(/%/g,"\\")).join("")}const Hs={tag:ho,id:ks,class:xs,attribute:Cs,nthchild:zs,nthoftype:Ts},Is={tag:lo,id:so,class:ro,attribute:no,nthchild:ao,nthoftype:co};function Ds(r,t,e){return Is[t](r,e)}function $s(r,t,e){const i=Hs[t];return i(r,e)}function Ws(r=[],t,e){return r.filter(i=>e(i)||!t(i))}function Bs(r=[],t){return r.sort((e,i)=>{const o=t(e),n=t(i);return o&&!n?-1:!o&&n?1:0})}function fe(){const r=new Map;let t;return(e,i)=>{if(e.length!==1)return t??(t=po(e,i));const[o]=e;let n=r.get(o);return n||(n=po(e,i),r.set(o,n)),n}}function*js(r,t,e=fe()){const i=new Set,o=e(r,t);for(const n of Ks(o,t))i.has(n)||(i.add(n),yield n)}function po(r,t){const{blacklist:e,whitelist:i,combineWithinSelector:o,maxCombinations:n}=t,s=ge(e),a=ge(i),h=(l,c)=>{const d=$s(r,c,t),u=Ws(d,s,a),m=Bs(u,a);return l[c]=o?Array.from(uo(m,{maxResults:n})):m.map(p=>[p]),l};return Gs(t).reduce(h,{})}function Gs(r){const{selectors:t,includeTag:e}=r,i=[...t];return e&&!i.includes("tag")&&i.push("tag"),i}function Vs(r){return r.includes(U.tag)||r.includes(U.nthoftype)?[...r]:[...r,U.tag]}function Xs(r){const{selectors:t,combineBetweenSelectors:e,includeTag:i,maxCandidates:o}=r,n=e?Os(t,{maxResults:o}):t.map(s=>[s]);return i?n.map(Vs):n}function*Ks(r,t){for(const e of Xs(t))yield*Ys(e,r)}function*Ys(r,t){const e={};for(const i of r){const o=t[i];o&&o.length>0&&(e[i]=o)}for(const i of Ns(e))yield Zs(i)}function qs(r,t){return t[r]?t[r].join(""):""}function Zs(r={}){const t=[...oo];return r[U.tag]&&r[U.nthoftype]&&t.splice(t.indexOf(U.tag),1),t.map(e=>qs(e,r)).join("")}function Js(r,t){return[...r.map(e=>t+qt.DESCENDANT+e),...r.map(e=>t+qt.CHILD+e)]}function*Qs(r,t){if(t==="")yield*r;else for(const e of r)yield*Js([e],t)}function*ta(r,t,e="",i,o=fe()){const n=js(r,i,o);for(const s of Qs(n,e))$e(r,s,t)&&(yield s)}function*ea(r,t,e="",i,o=fe()){if(r.length===0)return null;const n=[r.length>1?r:[],...gs(r,t).map(s=>[s])];for(const s of n)for(const a of ta(s,t,e,i,o))yield{foundElements:s,selector:a}}function*ia({elements:r,root:t,rootSelector:e="",options:i}){let o=t,n=e,s=!0;const a=fe();for(;s;){let h=!1;for(const l of ea(r,o,n,i,a)){const{foundElements:c,selector:d}=l;if(h=!0,$e(r,d,t))yield d;else{o=c[0],n=d;break}}h||(s=!1)}}function oa(r){(r instanceof NodeList||r instanceof HTMLCollection)&&(r=Array.from(r));const t=(Array.isArray(r)?r:[r]).filter(qi);return[...new Set(t)]}function na(r){return{value:r,include:!1}}function ra(r,t,e=qt.NONE){const i={};return t.forEach(o=>{Reflect.set(i,o,Ds(r,o).map(na))}),{element:r,operator:e,selectors:i}}function sa({selectors:r,operator:t}){let e=[...oo];r[U.tag]&&r[U.nthoftype]&&(e=e.filter(o=>o!==U.tag));let i="";return e.forEach(o=>{var n;((n=r[o])!==null&&n!==void 0?n:[]).forEach(({value:s,include:a})=>{a&&(i+=s)})}),t+i}function aa(r,t){const e=eo(r,t).reverse(),i=fs(t),o=e.map((n,s)=>{var a;const h=ra(n,[U.nthchild],i&&s===0?qt.NONE:qt.CHILD);return((a=h.selectors.nthchild)!==null&&a!==void 0?a:[]).forEach(l=>{l.include=!0}),h});return[i?"":t?":scope":":root",...o.map(sa)].join("")}function la(r,t){return r.map(e=>aa(e,t)).join(io)}var ha=function(r,t){var e={};for(var i in r)Object.prototype.hasOwnProperty.call(r,i)&&t.indexOf(i)<0&&(e[i]=r[i]);if(r!=null&&typeof Object.getOwnPropertySymbols=="function")for(var o=0,i=Object.getOwnPropertySymbols(r);o<i.length;o++)t.indexOf(i[o])<0&&Object.prototype.propertyIsEnumerable.call(r,i[o])&&(e[i[o]]=r[i[o]]);return e};function go(r,t={}){const e=Object.assign(Object.assign({},t),{maxResults:1});return ca(r,e).next().value}function*ca(r,t={}){var e;const i=oa(r),o=us(i[0],t),n=(e=o.root)!==null&&e!==void 0?e:We(i[0]);let s=0;for(const h of ia({elements:i,options:o,root:n,rootSelector:""}))if(yield h,s++,s>=o.maxResults)return;if(i.length>1){const{maxResults:h}=t,l=ha(t,["maxResults"]);if(yield i.map(c=>go(c,l)).join(io),s++,s>=o.maxResults)return}const a=t.root!==void 0;yield la(i,o.useScope||a?n:void 0)}const da=Math.pow(2,32),fo=()=>Math.round(Math.random()*da).toString(36),Be=()=>`${Math.round(performance.now())}-${fo()}-${fo()}`,Ot=1;let ua=class{constructor(t){this.destination=null,this.registrar=new Map,this.origin="",this.channelId="",this.receiver=this.receive.bind(this),this.preLog=[],this.wnd=t,t.addEventListener("message",this.receiver)}receive(t){if(t.source===null)throw Error("Event source is null");if(typeof t.data!="object")return;const e=t.data;if(!(!("_readium"in e)||!e._readium||e._readium<=0)){if(e.key==="_ping"){if(!this.destination){if(this.destination=t.source,this.origin=t.origin,this.channelId=e._channel,e._readium!==Ot){e._readium>Ot?this.send("error",`received comms version ${e._readium} higher than ${Ot}`):this.send("error",`received comms version ${e._readium} lower than ${Ot}`),this.destination=null,this.origin="",this.channelId="";return}this.send("_pong",void 0),this.preLog.forEach(i=>this.send("log",i)),this.preLog=[]}return}else if(this.channelId){if(e._channel!==this.channelId||t.origin!==this.origin)return}else return;this.handle(e)}}handle(t){const e=this.registrar.get(t.key);if(!e||e.length===0){t.strict&&this.send("_unhandled",t);return}e.forEach(i=>i.cb(t.data,o=>{this.send("_ack",o,t.id)}))}register(t,e,i){Array.isArray(t)||(t=[t]),t.forEach(o=>{const n=this.registrar.get(o);if(n&&n.length>=0){if(n.find(s=>s.module===e))throw new Error(`Trying to register another callback for combination of event ${o} and module ${e}`);n.push({cb:i,module:e}),this.registrar.set(o,n)}else this.registrar.set(o,[{cb:i,module:e}])})}unregister(t,e){Array.isArray(t)||(t=[t]),t.forEach(i=>{const o=this.registrar.get(i);!o||o.length===0||o.splice(o.findIndex(n=>n.module===e),1)})}unregisterAll(t){this.registrar.forEach((e,i)=>this.registrar.set(i,e.filter(o=>o.module!==t)))}log(...t){this.destination?this.send("log",t):this.preLog.push(t)}get ready(){return!!this.destination}destroy(){this.destination=null,this.channelId="",this.preLog=[],this.registrar.clear(),this.wnd.removeEventListener("message",this.receiver)}send(t,e,i=void 0,o=[]){if(!this.destination)throw Error("Attempted to send comms message before destination has been initialized");const n={_readium:Ot,_channel:this.channelId,id:i??Be(),key:t,data:e};try{this.destination.postMessage(n,{targetOrigin:this.origin,transfer:o})}catch(s){if(o.length>0)throw s;this.destination.postMessage(n,this.origin,o)}}};function So(r){return r.split("").reverse().join("")}function ma(r,t,e){const i=So(t);return e.map(o=>{const n=Math.max(0,o.end-t.length-o.errors),s=So(r.slice(n,o.end));return{start:_o(s,i,o.errors).reduce((a,h)=>o.end-h.end<a?o.end-h.end:a,o.end),end:o.end,errors:o.errors}})}function je(r){return(r|-r)>>31&1}function yo(r,t,e,i){let o=r.P[e],n=r.M[e];const s=i>>>31,a=t[e]|s,h=a|n,l=(a&o)+o^o|a;let c=n|~(l|o),d=o&l;const u=je(c&r.lastRowMask[e])-je(d&r.lastRowMask[e]);return c<<=1,d<<=1,d|=s,c|=je(i)-s,o=d|~(h|c),n=c&h,r.P[e]=o,r.M[e]=n,u}function _o(r,t,e){if(t.length===0)return[];e=Math.min(e,t.length);const i=[],o=32,n=Math.ceil(t.length/o)-1,s={P:new Uint32Array(n+1),M:new Uint32Array(n+1),lastRowMask:new Uint32Array(n+1)};s.lastRowMask.fill(-2147483648),s.lastRowMask[n]=1<<(t.length-1)%o;const a=new Uint32Array(n+1),h=new Map,l=[];for(let u=0;u<256;u++)l.push(a);for(let u=0;u<t.length;u+=1){const m=t.charCodeAt(u);if(h.has(m))continue;const p=new Uint32Array(n+1);h.set(m,p),m<l.length&&(l[m]=p);for(let S=0;S<=n;S+=1){p[S]=0;for(let y=0;y<o;y+=1){const g=S*o+y;g>=t.length||t.charCodeAt(g)===m&&(p[S]|=1<<y)}}}let c=Math.max(0,Math.ceil(e/o)-1);const d=new Uint32Array(n+1);for(let u=0;u<=c;u+=1)d[u]=(u+1)*o;d[n]=t.length;for(let u=0;u<=c;u+=1)s.P[u]=-1,s.M[u]=0;for(let u=0;u<r.length;u+=1){const m=r.charCodeAt(u);let p;m<l.length?p=l[m]:(p=h.get(m),typeof p>"u"&&(p=a));let S=0;for(let y=0;y<=c;y+=1)S=yo(s,p,y,S),d[y]+=S;if(d[c]-S<=e&&c<n&&(p[c+1]&1||S<0)){c+=1,s.P[c]=-1,s.M[c]=0;let y;if(c===n){const g=t.length%o;y=g===0?o:g}else y=o;d[c]=d[c-1]+y-S+yo(s,p,c,S)}else for(;c>0&&d[c]>=e+o;)c-=1;c===n&&d[c]<=e&&(d[c]<e&&i.splice(0,i.length),i.push({start:-1,end:u+1,errors:d[c]}),e=d[c])}return i}function pa(r,t,e){const i=_o(r,t,e);return ma(r,t,i)}function bo(r,t,e){let i=0;const o=[];for(;i!==-1;)i=r.indexOf(t,i),i!==-1&&(o.push({start:i,end:i+t.length,errors:0}),i+=1);return o.length>0?o:pa(r,t,e)}function vo(r,t){return t.length===0||r.length===0?0:1-bo(r,t,t.length)[0].errors/t.length}function ga(r,t,e={}){if(t.length===0)return null;const i=Math.min(256,t.length/2),o=bo(r,t,i);if(o.length===0)return null;const n=a=>{const h=1-a.errors/t.length,l=e.prefix?vo(r.slice(Math.max(0,a.start-e.prefix.length),a.start),e.prefix):1,c=e.suffix?vo(r.slice(a.end,a.end+e.suffix.length),e.suffix):1;let d=1;return typeof e.hint=="number"&&(d=1-Math.abs(a.start-e.hint)/r.length),(50*h+20*l+20*c+2*d)/92},s=o.map(a=>({start:a.start,end:a.end,score:n(a)}));return s.sort((a,h)=>h.score-a.score),s[0]}function Ge(r,t,e){const i=e===1?t:t-1;if(r.charAt(i).trim()!=="")return t;let o,n;if(e===2?(o=r.substring(0,t),n=o.trimEnd()):(o=r.substring(t),n=o.trimStart()),!n.length)return-1;const s=o.length-n.length;return e===2?t-s:t+s}function wo(r,t){const e=r.commonAncestorContainer.ownerDocument.createNodeIterator(r.commonAncestorContainer,NodeFilter.SHOW_TEXT),i=t===1?r.startContainer:r.endContainer,o=t===1?r.endContainer:r.startContainer;let n=e.nextNode();for(;n&&n!==i;)n=e.nextNode();t===2&&(n=e.previousNode());let s=-1;const a=()=>{if(n=t===1?e.nextNode():e.previousNode(),n){const h=n.textContent,l=t===1?0:h.length;s=Ge(h,l,t)}};for(;n&&s===-1&&n!==o;)a();if(n&&s>=0)return{node:n,offset:s};throw new RangeError("No text nodes with non-whitespace text found in range")}function fa(r){if(!r.toString().trim().length)throw new RangeError("Range contains no non-whitespace text");if(r.startContainer.nodeType!==Node.TEXT_NODE)throw new RangeError("Range startContainer is not a text node");if(r.endContainer.nodeType!==Node.TEXT_NODE)throw new RangeError("Range endContainer is not a text node");const t=r.cloneRange();let e=!1,i=!1;const o={start:Ge(r.startContainer.textContent,r.startOffset,1),end:Ge(r.endContainer.textContent,r.endOffset,2)};if(o.start>=0&&(t.setStart(r.startContainer,o.start),e=!0),o.end>0&&(t.setEnd(r.endContainer,o.end),i=!0),e&&i)return t;if(!e){const{node:n,offset:s}=wo(t,1);n&&s>=0&&t.setStart(n,s)}if(!i){const{node:n,offset:s}=wo(t,2);n&&s>0&&t.setEnd(n,s)}return t}function Ro(r){switch(r.nodeType){case Node.ELEMENT_NODE:case Node.TEXT_NODE:return r.textContent?.length??0;default:return 0}}function Co(r){let t=r.previousSibling,e=0;for(;t;)e+=Ro(t),t=t.previousSibling;return e}function Eo(r,...t){let e=t.shift();const i=r.ownerDocument.createNodeIterator(r,NodeFilter.SHOW_TEXT),o=[];let n=i.nextNode(),s,a=0;for(;e!==void 0&&n;)s=n,a+s.data.length>e?(o.push({node:s,offset:e-a}),e=t.shift()):(n=i.nextNode(),a+=s.data.length);for(;e!==void 0&&s&&a===e;)o.push({node:s,offset:s.data.length}),e=t.shift();if(e!==void 0)throw new RangeError("Offset exceeds text length");return o}let Se=class jt{constructor(t,e){if(e<0)throw new Error("Offset is invalid");this.element=t,this.offset=e}relativeTo(t){if(!t.contains(this.element))throw new Error("Parent is not an ancestor of current element");let e=this.element,i=this.offset;for(;e!==t;)i+=Co(e),e=e.parentElement;return new jt(e,i)}resolve(t={}){try{return Eo(this.element,this.offset)[0]}catch(e){if(this.offset===0&&t.direction!==void 0){const i=document.createTreeWalker(this.element.getRootNode(),NodeFilter.SHOW_TEXT);i.currentNode=this.element;const o=t.direction===1,n=o?i.nextNode():i.previousNode();if(!n)throw e;return{node:n,offset:o?0:n.data.length}}else throw e}}static fromCharOffset(t,e){switch(t.nodeType){case Node.TEXT_NODE:return jt.fromPoint(t,e);case Node.ELEMENT_NODE:return new jt(t,e);default:throw new Error("Node is not an element or text node")}}static fromPoint(t,e){switch(t.nodeType){case Node.TEXT_NODE:{if(e<0||e>t.data.length)throw new Error("Text node offset is out of range");if(!t.parentElement)throw new Error("Text node has no parent");const i=Co(t)+e;return new jt(t.parentElement,i)}case Node.ELEMENT_NODE:{if(e<0||e>t.childNodes.length)throw new Error("Child node offset is out of range");let i=0;for(let o=0;o<e;o++)i+=Ro(t.childNodes[o]);return new jt(t,i)}default:throw new Error("Point is not in an element or text node")}}},Ve=class ne{constructor(t,e){this.start=t,this.end=e}relativeTo(t){return new ne(this.start.relativeTo(t),this.end.relativeTo(t))}toRange(){let t,e;this.start.element===this.end.element&&this.start.offset<=this.end.offset?[t,e]=Eo(this.start.element,this.start.offset,this.end.offset):(t=this.start.resolve({direction:1}),e=this.end.resolve({direction:2}));const i=new Range;return i.setStart(t.node,t.offset),i.setEnd(e.node,e.offset),i}static fromRange(t){const e=Se.fromPoint(t.startContainer,t.startOffset),i=Se.fromPoint(t.endContainer,t.endOffset);return new ne(e,i)}static fromOffsets(t,e,i){return new ne(new Se(t,e),new Se(t,i))}static trimmedRange(t){return fa(ne.fromRange(t).toRange())}},Sa=class Pi{constructor(t,e,i){this.root=t,this.start=e,this.end=i}static fromRange(t,e){const i=Ve.fromRange(e).relativeTo(t);return new Pi(t,i.start.offset,i.end.offset)}static fromSelector(t,e){return new Pi(t,e.start,e.end)}toSelector(){return{type:"TextPositionSelector",start:this.start,end:this.end}}toRange(){return Ve.fromOffsets(this.root,this.start,this.end).toRange()}},ya=class Fi{constructor(t,e,i={}){this.root=t,this.exact=e,this.context=i}static fromRange(t,e){const i=t.textContent,o=Ve.fromRange(e).relativeTo(t),n=o.start.offset,s=o.end.offset,a=32;return new Fi(t,i.slice(n,s),{prefix:i.slice(Math.max(0,n-a),n),suffix:i.slice(s,Math.min(i.length,s+a))})}static fromSelector(t,e){const{prefix:i,suffix:o}=e;return new Fi(t,e.exact,{prefix:i,suffix:o})}toSelector(){return{type:"TextQuoteSelector",exact:this.exact,prefix:this.context.prefix,suffix:this.context.suffix}}toRange(t={}){return this.toPositionAnchor(t).toRange()}toPositionAnchor(t={}){const e=this.root.textContent,i=ga(e,this.exact,{...this.context,hint:t.hint});if(!i)throw new Error("Quote not found");return new Sa(this.root,i.start,i.end)}};function _a(r){const t=r.tagName.toUpperCase();return t==="IMG"||t==="VIDEO"||t==="AUDIO"||t==="IFRAME"||t==="OBJECT"||t==="EMBED"||t==="CANVAS"}function Po(r,t){const e=t&&kt(t);let i=null;if(e)try{i=r.querySelector(e)}catch(o){console.warn(`Invalid cssSelector: ${e}`,o)}return i??r.body??r.documentElement}function Fo(r,t){let e;try{e=r.querySelector(t.cssSelector)}catch(o){return console.error(`Invalid domRange cssSelector: ${t.cssSelector}`,o),null}if(!e)return console.error(`Can't resolve domRange cssSelector: ${t.cssSelector}`),null;let i=0;for(const o of e.childNodes)if(o.nodeType===Node.TEXT_NODE){if(i===t.textNodeIndex)return{node:o,offset:t.charOffset};i++}return console.error(`Can't resolve domRange textNodeIndex ${t.textNodeIndex} for selector: ${t.cssSelector}`),null}function Xe(r,t){try{const e=t.locations,i=t.text;if(e){const o=Br(e);if(o){const n=Fo(r,o.start),s=o.end?Fo(r,o.end):n;if(n&&s)try{const a=r.createRange();return n.offset!==void 0?a.setStart(n.node,n.offset):a.setStartBefore(n.node),s.offset!==void 0?a.setEnd(s.node,s.offset):a.setEndBefore(s.node),a}catch(a){console.warn("Invalid domRange, falling back:",a)}}}if(e){const o=jr(e);if(o){const n=Po(r,e),s=Tr(o,r,n);if(s.length>0)return s[0]}}if(i&&i.highlight){const o=Po(r,e),n=new ya(o,i.highlight,{prefix:i.before,suffix:i.after});try{return n.toRange()}catch{return console.warn("Quote not found:",n),null}}if(e){let o=null;if(!o&&kt(e)&&(o=r.querySelector(kt(e))),!o&&e.fragments){for(const n of e.fragments)if(o=r.getElementById(de(n)),o)break}if(o){const n=r.createRange();return o.childNodes.length===0||_a(o)?(n.selectNode(o),n):(n.setStartBefore(o),n.setEndAfter(o),n)}}}catch(e){console.error(e)}return null}let Mt=class{};const xo="readium-snapper-style",Ke="readium-navigation-lock-style",Ye=class re extends Mt{constructor(){super(...arguments),this.protected=!1,this.locked=!1,this.watchedRanges=[],this.watchedWithoutText=[],this.timelineEntries=new Map,this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts=new Map}static inDomOrder(t,e,i){const o=t.get(e),n=t.get(i);return!o||!n?0:o.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1}updateTimelineEntries(t,e){this.cachedFragmentIds=t,this.timelineEntries.clear(),this.cachedFragmentStarts.clear();for(const i of t){const o=e.document.getElementById(i);o&&this.timelineEntries.set(i,o)}this.sortedFragmentIds=Array.from(this.timelineEntries.keys()).sort((i,o)=>re.inDomOrder(this.timelineEntries,i,o)),this.refreshFragmentStarts()}refreshFragmentStarts(){for(const[t,e]of this.timelineEntries)this.cachedFragmentStarts.set(t,this.fragmentStart(e))}fragmentStart(t){return this.rectStart(t.getBoundingClientRect())}currentScrollExtent(){return{pos:0,size:0}}rectStart(t){return 0}lineStart(t){return this.rectStart(t)}registerTextLayout(t,e,i){this.textLayoutComms=e,e.register("watch_text_layout",i,(o,n)=>{const s=Array.isArray(o)?o:[];this.watchedRanges=s.map(a=>re.rangeOf(t,a)),this.watchedWithoutText=s.map(a=>!zt.deserialize(Array.isArray(a)?a[0]:a)?.highlight),t.requestAnimationFrame(()=>this.sendTextLayout(!0)),n(!0)})}registerNavigationLock(t,e,i){e.register("lock_navigation",i,(o,n)=>{if(this.locked=o===!0,t.document.getElementById(Ke)?.remove(),this.locked){const s=t.document.createElement("style");s.dataset.readium="true",s.id=Ke,s.textContent=`
                :root {
                    overflow: hidden !important;
                    touch-action: none !important;
                }`,t.document.head.appendChild(s)}n(!0)})}unlockNavigation(t){this.locked=!1,t.document.getElementById(Ke)?.remove()}unwatchTextLayout(){this.watchedRanges=[],this.watchedWithoutText=[],this.textLayoutComms=void 0}sendTextLayout(t=!1){if(!this.textLayoutComms?.ready||this.watchedRanges.length===0)return;const e={viewport:this.currentScrollExtent()};t&&(e.pieces=this.watchedRanges.map((i,o)=>{if(!i)return null;const n=this.lineStarts(i);return this.watchedWithoutText[o]?{...n,text:i.toString()}:n})),this.textLayoutComms.send("text_layout",e)}static rangeOf(t,e){const[i,o]=Array.isArray(e)?e:[e];return Xe(t.document,new rt({href:t.location.href,type:"text/html",text:zt.deserialize(i),locations:o?new pt({otherLocations:new Map([["cssSelector",o]])}):void 0}))??null}lineStarts(t){const e=t.startContainer.ownerDocument,i={offsets:[],starts:[]},o=e.createTreeWalker(t.commonAncestorContainer,NodeFilter.SHOW_TEXT);let n=o.currentNode.nodeType===Node.TEXT_NODE?o.currentNode:o.nextNode(),s=0,a=!1;for(;n;n=o.nextNode()){if(!t.intersectsNode(n)){if(s>0)break;continue}const h=n.textContent??"",l=n===t.startContainer?t.startOffset:0,c=n===t.endContainer?t.endOffset:h.length;if(l>=c)continue;const d=[];for(let v=l;v<c;v++){d.push(s);const R=/\s/.test(h[v]);(!R||!a)&&s++,a=R}const u=v=>{const R=e.createRange();R.setStart(n,v),R.setEnd(n,v+1);const E=R.getClientRects()[0];return E&&(E.width||E.height)?Math.round(this.lineStart(E)):void 0},m=(v,R)=>{i.starts.length>0&&i.starts[i.starts.length-1]===R||(i.offsets.push(d[v-l]),i.starts.push(R))},p=(v,R,E,P)=>{if(R===P)return;if(E-v===1)return m(E,P);let F=v+E>>1,x=u(F);for(;x===void 0&&++F<E;)x=u(F);if(x===void 0)return m(E,P);p(v,R,F,x),p(F,x,E,P)};let S=l,y=u(S);for(;y===void 0&&++S<c;)y=u(S);if(y===void 0)continue;let g=c-1,f=u(g);for(;f===void 0&&--g>S;)f=u(g);m(S,y),f!==void 0&&p(S,y,g,f)}return i}nearestPrecedingTimelineEntry(t){let e;for(const i of this.sortedFragmentIds){const o=this.timelineEntries.get(i),n=o.compareDocumentPosition(t);if(o===t||o.contains(t)||(n&Node.DOCUMENT_POSITION_FOLLOWING)!==0)e=i;else break}return e}fragmentFromGeometry(){for(const e of this.sortedFragmentIds){const i=this.timelineEntries.get(e);if(this.inCenterBand(i))return e}let t;for(const e of this.sortedFragmentIds){const i=this.timelineEntries.get(e);if(this.hasScrolledPast(i))t=e;else break}return t}firstFragmentIfReached(){const t=this.sortedFragmentIds[0];if(t===void 0)return;const e=this.timelineEntries.get(t);return this.hasScrolledPast(e)?t:void 0}currentTimelineFragment(){const{pos:t,size:e}=this.currentScrollExtent(),i=t+e/2;let o;for(const n of this.sortedFragmentIds){const s=this.cachedFragmentStarts.get(n);if(s!==void 0)if(s<=i)o=n;else break}return o}sortedVisibleFragmentIds(){const{pos:t,size:e}=this.currentScrollExtent(),i=t+e;let o=-1,n=-1;for(let s=0;s<this.sortedFragmentIds.length;s++){const a=this.cachedFragmentStarts.get(this.sortedFragmentIds[s]);a!==void 0&&(a<=t&&(o=s),a<i&&(n=s))}return o<0&&(o=0),n<o?[]:this.sortedFragmentIds.slice(o,n+1)}inCenterBand(t){return!1}buildStyles(){return`
        html, body {
            touch-action: manipulation;
            user-select: ${this.protected?"none":"auto"};
        }`}mount(t,e){const i=t.document.createElement("style");return i.dataset.readium="true",i.id=xo,i.textContent=this.buildStyles(),t.document.head.appendChild(i),e.register("protect",re.moduleName,(o,n)=>{this.protected=!0,i.textContent=this.buildStyles(),n(!0)}),e.register("unprotect",re.moduleName,(o,n)=>{this.protected=!1,i.textContent=this.buildStyles(),n(!0)}),e.log("Snapper Mounted"),!0}unmount(t,e){return t.document.getElementById(xo)?.remove(),this.timelineEntries.clear(),this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts.clear(),e.log("Snapper Unmounted"),!0}};Ye.moduleName="snapper",Ye.CENTER_TOLERANCE=.01;let D=Ye;function ba(r){return(r.document.documentElement.dir||r.document.body.dir).toLowerCase()==="rtl"}function ko(r,t){return r.getComputedStyle(t).direction==="rtl"}function zo(r){return(r.getComputedStyle(r.document.documentElement).writingMode||r.getComputedStyle(r.document.body).writingMode)==="vertical-lr"}function To(r){const t=r.getComputedStyle(r.document.documentElement).writingMode||r.getComputedStyle(r.document.body).writingMode;return t==="vertical-rl"||t==="vertical-lr"}const qe=2147483646;function Nt(r,t){const e=To(r),i=e&&zo(r),o=r.innerWidth,n=r.innerHeight,s=r.document.scrollingElement,a=s.scrollLeft,h=s.scrollTop,l=parseInt(r.getComputedStyle(r.document.documentElement).getPropertyValue("column-count")),c=t?.getBoundingClientRect(),d=c?-c.left:e&&!i?s.scrollWidth-o+a:a,u=c?-c.top:h;return{isVertical:e,isVertLR:i,viewportInlineSize:e?n:o,viewportBlockSize:e?o:n,pageInlineSize:e?n:o/(l||1),xDocOffset:d,yDocOffset:u,inlineScrollOffset:e?u:d,blockScrollOffset:e?d:u,inlineStart:m=>e?m.top:m.left,blockStart:m=>e?m.left:m.top,inlineSize:m=>e?m.height:m.width,blockSize:m=>e?m.width:m.height,applyPosition(m,p,S,y,g,f){m.style.position="absolute",m.style.zIndex=String(qe),e?(m.style.top=`${p*f}px`,m.style.left=`${S*f}px`,m.style.height=`${y*f}px`,m.style.width=`${g*f}px`):(m.style.left=`${p*f}px`,m.style.top=`${S*f}px`,m.style.width=`${y*f}px`,m.style.height=`${g*f}px`)},toRect(m,p,S,y){return e?new DOMRect(p,m,y,S):new DOMRect(m,p,S,y)}}}function Oo(r){return parseInt(r.getComputedStyle(r.document.documentElement).getPropertyValue("column-count"))}function va(r){const t=getComputedStyle(r),e=parseFloat(t.paddingTop||"0"),i=parseFloat(t.paddingBottom||"0");return r.clientHeight-e-i}function Mo(r){const t=Oo(r);if(!t)return!1;const e=r.document.querySelectorAll("div[id^='readium-virtual-page']");for(const h of e)h.remove();const i=e.length,o=r.document.scrollingElement.scrollWidth,n=r.visualViewport.width,s=Math.round(o/n*t)%t,a=t===1||s===0?0:t-s;if(a>0)for(let h=0;h<a;h++){const l=r.document.createElement("div");l.setAttribute("id",`readium-virtual-page-${h}`),l.dataset.readium="true",CSS.supports("break-before","column")?l.style.breakBefore="column":(CSS.supports("break-inside","avoid-column")&&(l.style.breakInside="avoid-column"),l.style.height=va(r.document.documentElement)+"px"),l.innerHTML="&#8203;",r.document.body.appendChild(l)}return i!==a}function Ze(r){const t=r.document.createElement("style");t.appendChild(r.document.createTextNode("*{}")),r.document.body.appendChild(t),r.document.body.removeChild(t)}const Je=()=>typeof window.CSSTransformValue<"u",wa=new Set(["backgroundColor","textColor","linkColor","visitedColor","primaryColor","secondaryColor","selectionBackgroundColor","selectionTextColor","blendFilter","darkenFilter","invertFilter","invertGaiji"]),No=/--(?:USER|RS)__([\w-]+)/g;function Ra(r,t){const e=r??"",i=t??"",o=new Set;for(const n of e.matchAll(No))o.add(n[1]);for(const n of i.matchAll(No))o.add(n[1]);for(const n of o)if(!wa.has(n))return!0;return!1}function Qe(r){const t={},e=r.document.documentElement.style;for(const i in r.document.documentElement.style)Object.hasOwn(e,i)&&!Number.isNaN(Number.parseInt(i))&&(t[e[i]]=e.getPropertyValue(e[i]));return t}function Lo(r,t){const e=Qe(r);Object.keys(e).forEach(i=>{t.hasOwnProperty(i)||ye(r,i)}),Object.entries(t).forEach(([i,o])=>{e[i]!==o&&Qt(r,i,o)})}function Uo(r,t){return r.document.documentElement.style.getPropertyValue(t)}function Qt(r,t,e){r.document.documentElement.style.setProperty(t,e)}function ye(r,t){r.document.documentElement.style.removeProperty(t)}function Ca(r){return r<.5?2*r*r:-1+(4-2*r)*r}function N(r){const t=r.getSelection();t&&t.removeAllRanges()}const Ea=["a","area","audio","button","canvas","details","input","label","option","select","submit","textarea","video"],Pa=["dialog","radiogroup","radio","menu","menuitem"];function ti(r){return Fa(r)?null:Ao(r)?r:r.parentElement?ti(r.parentElement):null}function Fa(r){return r?r.closest("[inert]")!==null||r.hasAttribute("disabled"):!0}function Ao(r){return r?r.role&&Pa.includes(r.role)?!0:r.tagName.toLowerCase()==="iframe"?!1:r.tabIndex>=0?!0:Ea.includes(r.nodeName.toLowerCase())||r.hasAttribute("contenteditable")&&r.getAttribute("contenteditable")?.toLowerCase()!=="false":!1}function _e(r,t){const e=Ho(r,r.document.body,t),i=r._readium_cssSelectorGenerator.getCssSelector(e,{selectors:["tag","id","class","nthchild","nthoftype","attribute"]});return new rt({href:"#",type:"application/xhtml+xml",locations:new pt({otherLocations:new Map([["cssSelector",i]])}),text:new zt({highlight:e.textContent||void 0})})}function Ho(r,t,e){for(var i=0;i<t.children.length;i++){const o=t.children[i];if(!za(o)&&xa(r,o,e))return ka(r,o)?o:Ho(r,o,e)}return t}function xa(r,t,e){if(t===document.body||t===document.documentElement)return!0;if(!document||!document.documentElement||!document.body)return!1;const i=t.getBoundingClientRect();return e?i.bottom>0&&i.top<r.innerHeight:i.right>0&&i.left<r.innerWidth}function ka(r,t){const e=t.getBoundingClientRect();return e.top>=0&&e.left>=0&&e.bottom<=r.innerHeight&&e.right<=r.innerWidth}function za(r){const t=getComputedStyle(r);if(t){const e=t.getPropertyValue("display");if(e!="block"&&e!="list-item"||t.getPropertyValue("opacity")==="0")return!0}return!1}const Ta={maxVelocity:200,minVariance:.01,historySize:20,minDirectionChanges:.2,maxConsistentScrolls:15},ei={maxVelocity:200,minVariance:1e-5,historySize:100,minDirectionChanges:.1,maxConsistentScrolls:20},Io={maxSelectionsPerSecond:500,minVariance:50,historySize:20},Oa={enabled:!0,maxSelectionPercent:.1,minThreshold:100,absoluteMaxChars:5e3,historySize:20};let be=class{constructor(t={}){this.history=[],this.consistentScrollCount=0,this.options={...Ta,...t}}analyze(t,e,i){if(i<=0)return!1;const o=Math.abs(e)/i,n=Date.now();if(this.history.push({timestamp:n,direction:t,velocity:o,distance:Math.abs(e)}),this.history=this.history.filter(p=>n-p.timestamp<2e3).slice(-(this.options.historySize||20)),this.history.length<3)return!1;if(o>this.options.maxVelocity)return this.resetAfterDetection(),!0;const s=this.history.map(p=>p.velocity),a=this.history.map(p=>p.distance),h=s.reduce((p,S)=>p+S,0)/s.length,l=a.reduce((p,S)=>p+S,0)/a.length,c=s.reduce((p,S)=>p+Math.pow(S-h,2),0)/s.length,d=a.reduce((p,S)=>p+Math.pow(S-l,2),0)/a.length;if(c<this.options.minVariance&&d<l*.1){if(this.consistentScrollCount++,this.consistentScrollCount>=(this.options.maxConsistentScrolls||10))return this.resetAfterDetection(),!0}else this.consistentScrollCount=Math.max(0,this.consistentScrollCount-1);let u=0,m=this.history[0].direction;for(let p=1;p<this.history.length;p++)this.history[p].direction!==m&&(u++,m=this.history[p].direction);return u/this.history.length>(this.options.minDirectionChanges||.3)?(this.resetAfterDetection(),!0):!1}resetAfterDetection(){this.history=this.history.slice(-3),this.consistentScrollCount=0}clear(){this.history=[],this.consistentScrollCount=0}};const Do="readium-column-snapper-style",Ma=200,$o=class B extends D{constructor(){super(...arguments),this.isSnapProtectionEnabled=!1,this.patternAnalyzer=null,this.lastTurnTime=0,this.rtl=!1,this.shakeTimeout=0,this.snappingCancelled=!1,this.alreadyScrollLeft=0,this.overscroll=0,this.cachedScrollWidth=0,this.touchState=0,this.startingX=void 0,this.endingX=void 0,this.onTouchStarter=this.onTouchStart.bind(this),this.onTouchEnder=this.onTouchEnd.bind(this),this.onWidthChanger=this.onWidthChange.bind(this),this.onTouchMover=this.onTouchMove.bind(this)}doc(){return this.wnd.document.scrollingElement}scrollOffset(){const t=this.doc().scrollLeft;return t!==0?t:this.alreadyScrollLeft}snapOffset(t){const e=t+(this.rtl?-1:1);return e-e%this.wnd.innerWidth}snapNormOffset(t){const e=t+1;return e-e%this.wnd.innerWidth}normScroll(){const t=this.doc().scrollLeft||(this.doc().style.transform?this.alreadyScrollLeft:0);return this.rtl?Math.abs(t):Math.max(0,this.wnd.scrollX>0?this.wnd.scrollX:t)}currentScrollExtent(){return{pos:this.normScroll(),size:this.wnd.innerWidth}}rectStart(t){return this.normScroll()+(this.rtl?this.wnd.innerWidth-t.right:t.left)}lineStart(t){const e=this.rectStart(t);return e-e%this.wnd.innerWidth}hasScrolledPast(t){const e=t.getBoundingClientRect();return this.rtl?e.left>=this.wnd.innerWidth:e.right<=0}currentTimelineFragment(){if(this.timelineEntries.size===0)return;const t=this.wnd.innerWidth;let e;for(const i of this.sortedFragmentIds){const o=this.timelineEntries.get(i).getBoundingClientRect();if(this.rtl?o.right>0:o.left<t)e=i;else break}return e}sortedVisibleFragmentIds(){const t=this.wnd.innerWidth;return this.sortedFragmentIds.filter(e=>{const i=this.timelineEntries.get(e).getBoundingClientRect();return this.rtl?i.left<t&&i.right>0:i.right>0&&i.left<t})}reportProgress(t){const e=this.cachedScrollWidth,i=this.wnd.innerWidth,o=this.normScroll(),n=Math.max(1,e-i),s=Math.max(0,Math.min(1,o/n)),a=Math.max(0,Math.min(1,(o+i)/e));this.comms.send("progress",{start:s,end:a,fragmentId:t!==void 0?t:this.currentTimelineFragment(),visibleFragmentIds:this.sortedVisibleFragmentIds()}),this.sendTextLayout()}shake(){if(this.overscroll!==0||this.shakeTimeout!==0)return;const t=this.doc(),e=this.normScroll()<5,i=this.rtl?e?"readium-bounce-r":"readium-bounce-l":"readium-bounce-r";t.classList.add(i);const o=this.scrollOffset();this.shakeTimeout=this.wnd.setTimeout(()=>{t.classList.remove(i),this.shakeTimeout=0,this.doc().scrollLeft=o},150)}takeOverSnap(){this.snappingCancelled=!0,this.clearTouches();const t=this.doc();this.overscroll=t.style.transform?.length>12?parseFloat(t.style.transform.slice(12).split("px")[0]):0}snapCurrentOffset(t=!1,e=!1){const i=this.doc(),o=Oo(this.wnd),n=this.cachedScrollWidth-this.wnd.innerWidth,s=Math.min(Math.max(0,this.normScroll()),n),a=this.dragOffset(),h=this.rtl?-a:a,l=this.wnd.innerWidth/3*(h>0?2:1),c=Math.min(n,Math.max(0,this.snapNormOffset(s+l))),d=this.rtl?-c:c,u=this.rtl?-s:s,m=d>u?"right":"left";if(this.checkSuspiciousSnap(m,Math.abs(d-u)),t&&d!==u){this.snappingCancelled=!1;const p=(f,v,R,E)=>R>E?v:f+(v-f)*Ca(R/E),S=Ma*o;let y;const g=f=>{if(this.snappingCancelled)return;y||(y=f);const v=f-y,R=p(this.overscroll,0,v,S),E=p(u,d,v,S);i.scrollLeft=E,this.overscroll!==0&&(Je()?i.attributeStyleMap.set("transform",new CSSTransformValue([new CSSTranslate(CSS.px(-R),CSS.px(0),CSS.px(0))])):i.style.transform=`translate3d(${-R}px, 0px, 0px)`),v<S?this.wnd.requestAnimationFrame(g):(this.clearTouches(),i.style.removeProperty("transform"),i.scrollLeft=d,e||this.reportProgress())};this.wnd.requestAnimationFrame(g)}else i.style.removeProperty("transform"),this.wnd.requestAnimationFrame(()=>{i.scrollLeft=d,this.clearTouches(),e||this.reportProgress()})}dragOffset(){return(this.startingX??0)-(this.endingX??0)}clearTouches(){this.startingX=void 0,this.endingX=void 0,this.overscroll=0}onTouchStart(t){if(t.stopPropagation(),!this.locked){switch(this.takeOverSnap(),t.touches.length){case 1:break;case 2:this.onTouchEnd(t);return;default:{this.onTouchEnd(t),this.comms.send("tap_more",t.touches.length);return}}this.startingX=t.touches[0].clientX,this.alreadyScrollLeft=this.doc().scrollLeft,this.touchState=1}}onTouchEnd(t){if(this.touchState===2){const e=this.dragOffset(),i=this.normScroll(),o=this.cachedScrollWidth-this.wnd.innerWidth,n=this.rtl?-e:e;this.cachedScrollWidth<=this.wnd.innerWidth?(this.reportProgress(),n>5&&this.comms.send("no_more",void 0),n<-5&&this.comms.send("no_less",void 0)):i<5&&n<5?(this.alreadyScrollLeft=0,this.comms.send("no_less",void 0)):o-i<5&&n>5&&(this.alreadyScrollLeft=this.rtl?-o:o,this.comms.send("no_more",void 0)),this.snapCurrentOffset(!0),this.comms.send("swipe",e)}this.touchState=0}onWidthChange(){this.cachedScrollWidth=this.doc().scrollWidth,this.comms.ready&&(this.snapCurrentOffset(),this.sendTextLayout(!0))}onTouchMove(t){if(this.touchState===0)return;this.touchState===1&&(this.touchState=2,N(this.wnd)),this.endingX=t.touches[0].clientX;const e=this.dragOffset(),i=this.alreadyScrollLeft+e,o=this.rtl?-(this.cachedScrollWidth-this.wnd.innerWidth):0,n=this.rtl?0:this.cachedScrollWidth-this.wnd.innerWidth;i<o?(this.overscroll=i,Je()?this.doc().attributeStyleMap.set("transform",new CSSTransformValue([new CSSTranslate(CSS.px(-i),CSS.px(0),CSS.px(0))])):this.doc().style.transform=`translate3d(${-i}px, 0px, 0px)`):i>n?(this.overscroll=i,Je()?this.doc().attributeStyleMap.set("transform",new CSSTransformValue([new CSSTranslate(CSS.px(-i),CSS.px(0),CSS.px(0))])):this.doc().style.transform=`translate3d(${-i}px, 0px, 0px)`):(this.overscroll=0,this.doc().style.removeProperty("transform"),this.doc().scrollLeft=i)}enableSnapProtection(){this.patternAnalyzer||(this.patternAnalyzer=new be({maxVelocity:this.wnd.innerWidth,minVariance:.1,historySize:5,maxConsistentScrolls:3,minDirectionChanges:.3}),this.isSnapProtectionEnabled=!0,this.comms?.log("Snap protection enabled"))}checkSuspiciousSnap(t,e){if(!this.isSnapProtectionEnabled||!this.patternAnalyzer)return;const i=Date.now(),o=i-(this.lastTurnTime||i);this.lastTurnTime=i,this.patternAnalyzer.analyze(t,e,o)&&this.comms?.send("content_protection",{type:"suspicious_snapping",timestamp:Date.now(),event:null})}mount(t,e){if(this.wnd=t,this.comms=e,this.rtl=ba(t),!super.mount(t,e))return!1;t.navigator.epubReadingSystem&&(t.navigator.epubReadingSystem.layoutStyle="paginated");const i=t.document.createElement("style");i.dataset.readium="true",i.id=Do,i.textContent=`
        @keyframes readium-bounce-l-animation {
            0%, 100% {transform: translate3d(0, 0, 0);}
            50% {transform: translate3d(-50px, 0, 0);}
        }

        @keyframes readium-bounce-r-animation {
            0%, 100% {transform: translate3d(0, 0, 0);}
            50% {transform: translate3d(50px, 0, 0);}
        }

        .readium-bounce-l {
            animation: readium-bounce-l-animation 150ms ease-out 1;
        }

        .readium-bounce-r {
            animation: readium-bounce-r-animation 150ms ease-out 1;
        }

        html {
            overflow: hidden;
        }

        body {
            -ms-overflow-style: none; /* for Internet Explorer, Edge */
        }

        * {
            scrollbar-width: none; /* for Firefox */
        }

        body::-webkit-scrollbar {
            display: none; /* for Chrome, Safari, and Opera */
        }
        `,t.document.head.appendChild(i),this.resizeObserver=new ResizeObserver(()=>{t.requestAnimationFrame(()=>{t&&Mo(t)}),this.onWidthChange()}),this.resizeObserver.observe(t.document.body),this.mutationObserver=new MutationObserver(s=>{for(const a of s)if(a.target===this.wnd.document.documentElement){const h=a.oldValue,l=a.target.getAttribute("style"),c=/transform\s*:\s*([^;]+)/,d=h?.match(c),u=l?.match(c);(!d&&!u&&Ra(h,l)||d&&!u||d&&u&&d[1]!==u[1])&&(t.requestAnimationFrame(()=>{t&&Mo(t)}),this.onWidthChange())}else t.requestAnimationFrame(()=>this.cachedScrollWidth=this.doc().scrollWidth)}),t.frameElement&&this.mutationObserver.observe(t.frameElement,{attributes:!0,attributeFilter:["style"]}),this.mutationObserver.observe(t.document,{attributes:!0,attributeFilter:["style"]}),this.mutationObserver.observe(t.document.documentElement,{attributes:!0,attributeFilter:["style"]}),e.register("scroll_protection",B.moduleName,(s,a)=>{this.enableSnapProtection(),a(!0)});const o=s=>{const a=this.doc().scrollLeft;return this.doc().scrollLeft=this.snapOffset(s),a!==this.doc().scrollLeft},n=s=>{const a=this.doc().scrollLeft,h=this.snapNormOffset(Math.max(0,Math.min(this.cachedScrollWidth-t.innerWidth,s)));return this.doc().scrollLeft=-h,a!==this.doc().scrollLeft};return t.addEventListener("orientationchange",this.onWidthChanger),t.addEventListener("resize",this.onWidthChanger),t.requestAnimationFrame(()=>this.cachedScrollWidth=this.doc().scrollWidth),this.registerTextLayout(t,e,B.moduleName),this.registerNavigationLock(t,e,B.moduleName),e.register("go_progression",B.moduleName,(s,a)=>{const h=s;if(h<0||h>1){e.send("error",{message:"go_progression must be given a position from 0.0 to 1.0"}),a(!1);return}this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth;const l=(this.cachedScrollWidth-t.innerWidth)*h;this.rtl?this.doc().scrollLeft=-this.snapNormOffset(l):this.doc().scrollLeft=this.snapOffset(l),this.reportProgress(),N(this.wnd),a(!0)})}),e.register("go_id",B.moduleName,(s,a)=>{const h=t.document.getElementById(s);if(!h){a(!1);return}this.wnd.requestAnimationFrame(()=>{this.rtl?this.doc().scrollLeft=-this.snapNormOffset(this.rectStart(h.getBoundingClientRect())):this.doc().scrollLeft=this.snapOffset(h.getBoundingClientRect().left+t.scrollX);const l=s;this.reportProgress(this.timelineEntries.has(l)?l:this.nearestPrecedingTimelineEntry(h)),N(this.wnd),a(!0)})}),e.register("go_text",B.moduleName,(s,a)=>{const h=D.rangeOf(t,s);if(!h){a(!1);return}this.wnd.requestAnimationFrame(()=>{this.rtl?this.doc().scrollLeft=-this.snapNormOffset(this.rectStart(h.getBoundingClientRect())):this.doc().scrollLeft=this.snapOffset(h.getBoundingClientRect().left+t.scrollX),this.reportProgress(this.nearestPrecedingTimelineEntry(h.startContainer)),N(this.wnd),a(!0)})}),e.register("go_end",B.moduleName,(s,a)=>{this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth;let h;if(this.rtl?h=-this.snapNormOffset(this.cachedScrollWidth-t.innerWidth):h=this.snapOffset(this.cachedScrollWidth),this.doc().scrollLeft===h)return a(!1);this.doc().scrollLeft=h,this.reportProgress(this.sortedFragmentIds[this.sortedFragmentIds.length-1]),N(this.wnd),a(!0)})}),e.register("go_start",B.moduleName,(s,a)=>{this.wnd.requestAnimationFrame(()=>{if(this.doc().scrollLeft===0)return a(!1);this.doc().scrollLeft=0,this.reportProgress(this.firstFragmentIfReached()),N(this.wnd),a(!0)})}),e.register("go_prev",B.moduleName,(s,a)=>{this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth;let h;this.rtl?h=n(this.normScroll()-t.innerWidth):h=o(t.scrollX-t.innerWidth),this.reportProgress(),h&&(N(this.wnd),this.checkSuspiciousSnap("left",this.wnd.innerWidth)),a(h)})}),e.register("go_next",B.moduleName,(s,a)=>{this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth;let h;this.rtl?h=n(this.normScroll()+t.innerWidth):h=o(t.scrollX+t.innerWidth),this.reportProgress(),h&&(N(this.wnd),this.checkSuspiciousSnap("right",this.wnd.innerWidth)),a(h)})}),e.register("unfocus",B.moduleName,(s,a)=>{this.snappingCancelled=!0,N(this.wnd),a(!0)}),e.register("shake",B.moduleName,(s,a)=>{this.shake(),a(!0)}),e.register("focus",B.moduleName,(s,a)=>{this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth,this.snapCurrentOffset(!1,!0),this.reportProgress(),a(!0)})}),e.register("first_visible_locator",B.moduleName,(s,a)=>{const h=_e(t,!1);this.comms.send("first_visible_locator",h.serialize()),a(!0)}),e.register("timeline_entries",B.moduleName,(s,a)=>{this.updateTimelineEntries(Array.isArray(s)?s:[],t),t.requestAnimationFrame(()=>this.reportProgress()),a(!0)}),t.addEventListener("touchstart",this.onTouchStarter,{passive:!0}),t.addEventListener("touchend",this.onTouchEnder,{passive:!0}),t.addEventListener("touchmove",this.onTouchMover,{passive:!0}),t.document.addEventListener("touchstart",()=>{}),e.log("ColumnSnapper Mounted"),!0}unmount(t,e){return this.snappingCancelled=!0,e.unregisterAll(B.moduleName),this.unwatchTextLayout(),this.unlockNavigation(t),this.resizeObserver.disconnect(),this.mutationObserver.disconnect(),this.patternAnalyzer&&(this.patternAnalyzer.clear(),this.patternAnalyzer=null,this.isSnapProtectionEnabled=!1),t.removeEventListener("touchstart",this.onTouchStarter),t.removeEventListener("touchend",this.onTouchEnder),t.removeEventListener("touchmove",this.onTouchMover),t.removeEventListener("orientationchange",this.onWidthChanger),t.removeEventListener("resize",this.onWidthChanger),t.document.getElementById(Do)?.remove(),this.timelineEntries.clear(),e.log("ColumnSnapper Unmounted"),super.unmount(t,e)}};$o.moduleName="column_snapper";let Na=$o;const Wo="readium-scroll-snapper-style",Bo=class j extends D{constructor(){super(...arguments),this.patternAnalyzer=null,this.lastScrollTime=0,this.isScrollProtectionEnabled=!1,this.initialScrollHandled=!1,this.isScrolling=!1,this.lastScrollTop=0,this.isResizing=!1,this.resizeDebounce=null,this.handleScroll=t=>{if(this.comms.ready&&!this.isResizing){if(!this.initialScrollHandled){this.lastScrollTop=this.doc().scrollTop,this.initialScrollHandled=!0,this.reportProgress();return}this.isScrolling||(this.isScrolling=!0,this.wnd.requestAnimationFrame(()=>{this.reportProgress();const e=this.doc().scrollTop,i=e-this.lastScrollTop;if(this.lastScrollTop=e,this.isScrollProtectionEnabled&&Math.abs(i)>5){const o=Date.now(),n=o-(this.lastScrollTime||o);if(this.patternAnalyzer&&this.patternAnalyzer.analyze(i>0?"down":"up",Math.abs(i),n)){const s=t.target&&"tagName"in t.target?{tagName:t.target.tagName}:null;this.comms?.send("content_protection",{type:"suspicious_scrolling",timestamp:Date.now(),scrollDelta:i,scrollDirection:i>0?"down":"up",targetElement:s})}this.lastScrollTime=o}this.comms.send("scroll",i),this.isScrolling=!1}))}}}doc(){return this.wnd.document.scrollingElement}hasScrolledPast(t){const e=this.wnd.innerHeight/2;return t.getBoundingClientRect().top<=e+this.wnd.innerHeight*D.CENTER_TOLERANCE}inCenterBand(t){const e=t.getBoundingClientRect(),i=this.wnd.innerHeight/2,o=this.wnd.innerHeight*D.CENTER_TOLERANCE,n=i-o,s=i+o;return e.height===0?e.top<=s&&e.top>=n:Math.max(0,Math.min(e.bottom,s)-Math.max(e.top,n))/e.height>=D.CENTER_TOLERANCE}currentScrollExtent(){return{pos:this.doc().scrollTop,size:this.wnd.innerHeight}}rectStart(t){return t.top+this.doc().scrollTop}reportProgress(t){if(!this.comms.ready)return;const e=Math.ceil(this.doc().scrollTop),i=this.doc().scrollHeight,o=this.wnd.innerHeight,n=Math.max(0,Math.min(1,e/i)),s=Math.max(0,Math.min(1,(e+o)/i));this.comms.send("progress",{start:n,end:s,fragmentId:t!==void 0?t:this.currentTimelineFragment(),visibleFragmentIds:this.sortedVisibleFragmentIds()}),this.sendTextLayout()}enableScrollProtection(){this.patternAnalyzer||(this.patternAnalyzer=new be(ei),this.isScrollProtectionEnabled=!0,this.comms?.log("Scroll protection enabled"))}mount(t,e){this.wnd=t,this.comms=e,this.initialScrollHandled=!1,this.lastScrollTop=0,this.isResizing=!1,this.resizeDebounce&&(this.wnd.clearTimeout(this.resizeDebounce),this.resizeDebounce=null),t.navigator.epubReadingSystem&&(t.navigator.epubReadingSystem.layoutStyle="scrolling");const i=t.document.createElement("style");return i.dataset.readium="true",i.id=Wo,i.textContent=`
        * {
            scrollbar-width: none; /* for Firefox */
        }

        body::-webkit-scrollbar {
            display: none; /* for Chrome, Safari, and Opera */
        }
        `,t.document.head.appendChild(i),this.resizeObserver=new ResizeObserver(()=>{this.resizeDebounce&&this.wnd.clearTimeout(this.resizeDebounce),this.isResizing=!0,this.resizeDebounce=this.wnd.setTimeout(()=>{this.isResizing=!1,this.resizeDebounce=null,this.refreshFragmentStarts(),this.reportProgress(),this.sendTextLayout(!0)},50)}),this.resizeObserver.observe(t.document.body),t.addEventListener("scroll",this.handleScroll,{passive:!0}),e.register("force_webkit_recalc",j.moduleName,()=>{Ze(this.wnd);const o=this.doc().scrollTop;o>1?this.doc().scrollTop=o-1:this.doc().scrollTop=o+1,this.doc().scrollTop=o}),this.registerTextLayout(t,e,j.moduleName),this.registerNavigationLock(t,e,j.moduleName),e.register("go_progression",j.moduleName,(o,n)=>{const s=o;if(s<0||s>1){e.send("error",{message:"go_progression must be given a position from 0.0 to 1.0"}),n(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=this.doc().offsetHeight*s,this.reportProgress(this.fragmentFromGeometry()),N(this.wnd),n(!0)})}),e.register("go_id",j.moduleName,(o,n)=>{const s=t.document.getElementById(o);if(!s){n(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=s.getBoundingClientRect().top+t.scrollY-t.innerHeight/2;const a=o;this.reportProgress(this.timelineEntries.has(a)?a:this.nearestPrecedingTimelineEntry(s)),N(this.wnd),n(!0)})}),e.register("go_text",j.moduleName,(o,n)=>{const s=D.rangeOf(t,o);if(!s){n(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=s.getBoundingClientRect().top+t.scrollY-t.innerHeight/2,this.reportProgress(this.nearestPrecedingTimelineEntry(s.startContainer)),N(this.wnd),n(!0)})}),e.register("go_start",j.moduleName,(o,n)=>{if(this.doc().scrollTop===0)return n(!1);this.doc().scrollTop=0,this.reportProgress(this.firstFragmentIfReached()),n(!0)}),e.register("go_end",j.moduleName,(o,n)=>{if(this.doc().scrollTop===this.doc().scrollHeight-this.doc().offsetHeight)return n(!1);this.doc().scrollTop=this.doc().scrollHeight-this.doc().offsetHeight,this.reportProgress(this.sortedFragmentIds[this.sortedFragmentIds.length-1]),n(!0)}),e.register("unfocus",j.moduleName,(o,n)=>{N(this.wnd),n(!0)}),e.register("scroll_protection",j.moduleName,(o,n)=>{this.enableScrollProtection(),n(!0)}),e.register(["go_next","go_prev"],j.moduleName,(o,n)=>n(!1)),e.register("focus",j.moduleName,(o,n)=>{this.reportProgress(),n(!0)}),e.register("first_visible_locator",j.moduleName,(o,n)=>{const s=_e(t,!0);this.comms.send("first_visible_locator",s.serialize()),n(!0)}),e.register("timeline_entries",j.moduleName,(o,n)=>{this.updateTimelineEntries(Array.isArray(o)?o:[],t),n(!0)}),e.log("ScrollSnapper Mounted"),!0}unmount(t,e){return e.unregisterAll(j.moduleName),this.unwatchTextLayout(),this.unlockNavigation(t),this.resizeObserver.disconnect(),this.handleScroll&&t.removeEventListener("scroll",this.handleScroll),t.document.getElementById(Wo)?.remove(),this.timelineEntries.clear(),this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts.clear(),this.patternAnalyzer&&(this.patternAnalyzer.clear(),this.patternAnalyzer=null,this.isScrollProtectionEnabled=!1),e.log("ScrollSnapper Unmounted"),!0}};Bo.moduleName="scroll_snapper";let La=Bo;const jo=class G extends D{constructor(){super(...arguments),this.patternAnalyzer=null,this.lastScrollTime=0,this.isScrollProtectionEnabled=!1,this.initialScrollHandled=!1,this.isScrolling=!1,this.lastScrollTop=0,this.isResizing=!1,this.resizeDebounce=null,this.handleScroll=t=>{if(this.comms.ready&&!this.isResizing){if(!this.initialScrollHandled){this.lastScrollTop=this.doc().scrollTop,this.initialScrollHandled=!0,this.reportProgress();return}this.isScrolling||(this.isScrolling=!0,this.wnd.requestAnimationFrame(()=>{this.reportProgress();const e=this.doc().scrollTop,i=e-this.lastScrollTop;if(this.lastScrollTop=e,this.isScrollProtectionEnabled&&Math.abs(i)>5){const o=Date.now(),n=o-(this.lastScrollTime||o);if(this.patternAnalyzer&&this.patternAnalyzer.analyze(i>0?"down":"up",Math.abs(i),n)){const s=t.target&&"tagName"in t.target?{tagName:t.target.tagName}:null;this.comms?.send("content_protection",{type:"suspicious_scrolling",timestamp:Date.now(),scrollDelta:i,scrollDirection:i>0?"down":"up",targetElement:s})}this.lastScrollTime=o}this.comms.send("scroll",i),this.isScrolling=!1}))}}}doc(){return this.wnd.document.scrollingElement}hasScrolledPast(t){const e=this.wnd.innerHeight/2;return t.getBoundingClientRect().top<=e+this.wnd.innerHeight*D.CENTER_TOLERANCE}inCenterBand(t){const e=t.getBoundingClientRect(),i=this.wnd.innerHeight/2,o=this.wnd.innerHeight*D.CENTER_TOLERANCE,n=i-o,s=i+o;return e.height===0?e.top<=s&&e.top>=n:Math.max(0,Math.min(e.bottom,s)-Math.max(e.top,n))/e.height>=D.CENTER_TOLERANCE}currentScrollExtent(){return{pos:this.doc().scrollTop,size:this.wnd.innerHeight}}rectStart(t){return t.top+this.doc().scrollTop}reportProgress(t){if(!this.comms.ready)return;const e=Math.ceil(this.doc().scrollTop),i=this.doc().scrollHeight,o=this.wnd.innerHeight,n=Math.max(0,Math.min(1,e/i)),s=Math.max(0,Math.min(1,(e+o)/i));this.comms.send("progress",{start:n,end:s,fragmentId:t!==void 0?t:this.currentTimelineFragment(),visibleFragmentIds:this.sortedVisibleFragmentIds()}),this.sendTextLayout()}enableScrollProtection(){this.patternAnalyzer||(this.patternAnalyzer=new be(ei),this.isScrollProtectionEnabled=!0,this.comms?.log("Scroll protection enabled"))}mount(t,e){return this.wnd=t,this.comms=e,this.initialScrollHandled=!1,this.lastScrollTop=0,this.isResizing=!1,this.resizeDebounce&&(this.wnd.clearTimeout(this.resizeDebounce),this.resizeDebounce=null),this.resizeObserver=new ResizeObserver(()=>{this.resizeDebounce&&this.wnd.clearTimeout(this.resizeDebounce),this.isResizing=!0,this.resizeDebounce=this.wnd.setTimeout(()=>{this.isResizing=!1,this.resizeDebounce=null,this.refreshFragmentStarts(),this.reportProgress(),this.sendTextLayout(!0)},50)}),this.resizeObserver.observe(t.document.body),t.addEventListener("scroll",this.handleScroll,{passive:!0}),e.register("force_webkit_recalc",G.moduleName,()=>{Ze(this.wnd);const i=this.doc().scrollTop;i>1?this.doc().scrollTop=i-1:this.doc().scrollTop=i+1,this.doc().scrollTop=i}),this.registerTextLayout(t,e,G.moduleName),this.registerNavigationLock(t,e,G.moduleName),e.register("go_progression",G.moduleName,(i,o)=>{const n=i;if(n<0||n>1){e.send("error",{message:"go_progression must be given a position from 0.0 to 1.0"}),o(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=this.doc().offsetHeight*n,this.reportProgress(this.fragmentFromGeometry()),N(this.wnd),o(!0)})}),e.register("go_id",G.moduleName,(i,o)=>{const n=t.document.getElementById(i);if(!n){o(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=n.getBoundingClientRect().top+t.scrollY-t.innerHeight/2;const s=i;this.reportProgress(this.timelineEntries.has(s)?s:this.nearestPrecedingTimelineEntry(n)),N(this.wnd),o(!0)})}),e.register("go_text",G.moduleName,(i,o)=>{const n=D.rangeOf(t,i);if(!n){o(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=n.getBoundingClientRect().top+t.scrollY-t.innerHeight/2,this.reportProgress(this.nearestPrecedingTimelineEntry(n.startContainer)),N(this.wnd),o(!0)})}),e.register("go_start",G.moduleName,(i,o)=>{if(this.doc().scrollTop===0)return o(!1);this.doc().scrollTop=0,this.reportProgress(this.firstFragmentIfReached()),o(!0)}),e.register("go_end",G.moduleName,(i,o)=>{if(this.doc().scrollTop===this.doc().scrollHeight-this.doc().offsetHeight)return o(!1);this.doc().scrollTop=this.doc().scrollHeight-this.doc().offsetHeight,this.reportProgress(this.sortedFragmentIds[this.sortedFragmentIds.length-1]),o(!0)}),e.register("unfocus",G.moduleName,(i,o)=>{N(this.wnd),o(!0)}),e.register("scroll_protection",G.moduleName,(i,o)=>{this.enableScrollProtection(),o(!0)}),e.register(["go_next","go_prev"],G.moduleName,(i,o)=>o(!1)),e.register("focus",G.moduleName,(i,o)=>{this.reportProgress(),o(!0)}),e.register("first_visible_locator",G.moduleName,(i,o)=>{const n=_e(t,!0);e.send("first_visible_locator",n.serialize()),o(!0)}),e.register("timeline_entries",G.moduleName,(i,o)=>{this.updateTimelineEntries(Array.isArray(i)?i:[],t),o(!0)}),e.log("WebPubSnapper Mounted"),!0}unmount(t,e){return e.unregisterAll(G.moduleName),this.unwatchTextLayout(),this.unlockNavigation(t),this.resizeObserver.disconnect(),this.handleScroll&&t.removeEventListener("scroll",this.handleScroll),this.patternAnalyzer&&(this.patternAnalyzer.clear(),this.patternAnalyzer=null,this.isScrollProtectionEnabled=!1),this.timelineEntries.clear(),this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts.clear(),e.log("WebPubSnapper Unmounted"),!0}};jo.moduleName="webpub_snapper";let Ua=jo;function Aa(r,t){const e=t.map(h=>h.toUpperCase()),i=[],o=r.commonAncestorContainer,n=o.nodeType===Node.TEXT_NODE?o.parentNode:o,s=r.startContainer.ownerDocument.createTreeWalker(n,NodeFilter.SHOW_TEXT);let a=s.nextNode();for(;a;){if(r.intersectsNode(a)){let h=a.parentNode,l=!1;for(;h;){if(h.nodeType===Node.ELEMENT_NODE&&e.includes(h.tagName.toUpperCase())){l=!0;break}h=h.parentNode}if(!l){const c=r.cloneRange();c.selectNode(a),c.compareBoundaryPoints(Range.START_TO_START,r)<0&&c.setStart(r.startContainer,r.startOffset),c.compareBoundaryPoints(Range.END_TO_END,r)>0&&c.setEnd(r.endContainer,r.endOffset);for(const d of c.getClientRects())i.push({left:d.left,right:d.right,top:d.top,bottom:d.bottom,width:d.width,height:d.height})}}a=s.nextNode()}return i}function Lt(r,t,e=!1,i=0){let o;if(Array.isArray(r))o=r;else{let l=r.getClientRects();l.length||r.commonAncestorContainer.nodeType===Node.ELEMENT_NODE&&(l=r.commonAncestorContainer.getClientRects()),o=[];for(const c of l)o.push({bottom:c.bottom,height:c.height,left:c.left,right:c.right,top:c.top,width:c.width})}if(i)for(const l of o)l.left-=i,l.top-=i,l.right+=i,l.bottom+=i,l.width+=i*2,l.height+=i*2;const n=Go(o,1,t,e),s=Ia(n,1),a=Vo(s),h=4;for(let l=a.length-1;l>=0;l--){const c=a[l];if(!(c.width*c.height>h))if(a.length>1)a.splice(l,1);else break}return a}function Go(r,t,e,i=!1){for(let o=0;o<r.length;o++)for(let n=o+1;n<r.length;n++){const s=r[o],a=r[n];if(s===a)continue;const h=nt(s.top,a.top,t)&&nt(s.bottom,a.bottom,t),l=nt(s.left,a.left,t)&&nt(s.right,a.right,t);if((l&&!e&&!i||h&&!l)&&Ko(s,a,t)){const c=r.filter(u=>u!==s&&u!==a),d=Ha(s,a);return c.push(d),Go(c,t,e,i)}}return r}function Ha(r,t){const e=Math.min(r.left,t.left),i=Math.max(r.right,t.right),o=Math.min(r.top,t.top),n=Math.max(r.bottom,t.bottom);return{bottom:n,height:n-o,left:e,right:i,top:o,width:i-e}}function Ia(r,t){const e=new Set(r);for(const i of r){if(!(i.width>1&&i.height>1)){e.delete(i);continue}for(const o of r)if(i!==o&&e.has(o)&&Da(o,i,t)){e.delete(i);break}}return Array.from(e)}function Da(r,t,e){return dt(r,t.left,t.top,e)&&dt(r,t.right,t.top,e)&&dt(r,t.left,t.bottom,e)&&dt(r,t.right,t.bottom,e)}function dt(r,t,e,i){return(r.left<t||nt(r.left,t,i))&&(r.right>t||nt(r.right,t,i))&&(r.top<e||nt(r.top,e,i))&&(r.bottom>e||nt(r.bottom,e,i))}function Vo(r){for(let t=0;t<r.length;t++)for(let e=t+1;e<r.length;e++){const i=r[t],o=r[e];if(i!==o&&Ko(i,o,-1)){let n=[],s;const a=Xo(i,o);if(a.length===1)n=a,s=i;else{const l=Xo(o,i);a.length<l.length?(n=a,s=i):(n=l,s=o)}const h=r.filter(l=>l!==s);return Array.prototype.push.apply(h,n),Vo(h)}}return r}function Xo(r,t){const e=$a(t,r);if(e.height===0||e.width===0)return[r];const i=[];{const o={bottom:r.bottom,height:0,left:r.left,right:e.left,top:r.top,width:0};o.width=o.right-o.left,o.height=o.bottom-o.top,o.height!==0&&o.width!==0&&i.push(o)}{const o={bottom:e.top,height:0,left:e.left,right:e.right,top:r.top,width:0};o.width=o.right-o.left,o.height=o.bottom-o.top,o.height!==0&&o.width!==0&&i.push(o)}{const o={bottom:r.bottom,height:0,left:e.left,right:e.right,top:e.bottom,width:0};o.width=o.right-o.left,o.height=o.bottom-o.top,o.height!==0&&o.width!==0&&i.push(o)}{const o={bottom:r.bottom,height:0,left:e.right,right:r.right,top:r.top,width:0};o.width=o.right-o.left,o.height=o.bottom-o.top,o.height!==0&&o.width!==0&&i.push(o)}return i}function $a(r,t){const e=Math.max(r.left,t.left),i=Math.min(r.right,t.right),o=Math.max(r.top,t.top),n=Math.min(r.bottom,t.bottom);return{bottom:n,height:Math.max(0,n-o),left:e,right:i,top:o,width:Math.max(0,i-e)}}function Ko(r,t,e){return(r.left<t.right||e>=0&&nt(r.left,t.right,e))&&(t.left<r.right||e>=0&&nt(t.left,r.right,e))&&(r.top<t.bottom||e>=0&&nt(r.top,t.bottom,e))&&(t.top<r.bottom||e>=0&&nt(t.top,r.bottom,e))}function nt(r,t,e){return Math.abs(r-t)<=e}let Wa=class{constructor(t,e){this.window=t,this.copyHistory=[],this.lastSelectionLength=0,this.lastSelectionTime=0,this.options=e}cleanupOldHistory(t){this.copyHistory=this.copyHistory.filter(e=>t-e.timestamp<1e4),this.copyHistory.length>this.options.historySize&&(this.copyHistory=this.copyHistory.slice(-this.options.historySize))}isSuspiciousPattern(t){return this.copyHistory.length<3?!1:this.copyHistory.filter(e=>t-e.timestamp<2e3).length>=3?!0:this.copyHistory.slice().sort((e,i)=>e.timestamp-i.timestamp).every((e,i,o)=>i===0?!0:e.length>o[i-1].length*1.5)}shouldAllowCopy(t){if(!this.options.enabled)return!0;const e=this.window.getSelection();if(!e)return!0;const i=e.toString().length,o=this.window.document.body.innerText.length,n=Date.now();if(this.cleanupOldHistory(n),i<this.options.minThreshold)return this.copyHistory.push({timestamp:n,length:i,wasBlocked:!1}),!0;const s=n-this.lastSelectionTime<100&&i>this.lastSelectionLength*1.5,a=Math.min(o*this.options.maxSelectionPercent,this.options.absoluteMaxChars),h=this.isSuspiciousPattern(n),l=i>a||s||h;return this.copyHistory.push({timestamp:n,length:i,wasBlocked:l}),l?(t?.preventDefault(),!1):(this.lastSelectionLength=i,this.lastSelectionTime=n,!0)}destroy(){this.lastSelectionLength=0,this.lastSelectionTime=0,this.copyHistory=[],this.options.enabled=!1}},Ba=class{constructor(t=Io){this.options=t,this.events=[],this.selectionStartTime=0,this.lastSelectionTime=0,this.lastSelectionPosition=0,this.selectionPatterns=[],this.lastSelectedText=""}analyze(t){if(!t)return this.clear(),!1;const e=t.toString();if(e.length===0)return this.clear(),!1;if(t.type!=="Range"||!t.rangeCount)return!1;const i=Date.now();if(e.length<=50||e===this.lastSelectedText)return!1;if(this.selectionStartTime===0)return this.selectionStartTime=i,this.lastSelectedText=e,!1;if(i-this.selectionStartTime<500)return!1;i-this.lastSelectionTime>1e3&&(this.lastSelectionTime=i),this.selectionStartTime===0&&(this.selectionStartTime=i),this.lastSelectedText=e;const o=this.analyzeSelectionPattern(t,i);return this.cleanup(i),o}analyzeSelectionPattern(t,e){if(!t.rangeCount)return!1;const i=t.getRangeAt(0),o=i.toString(),n=(e-this.selectionStartTime)/1e3;if(o.length/Math.max(1,n)>this.options.maxSelectionsPerSecond)return!0;const s=i.startOffset,a=Math.abs(s-this.lastSelectionPosition);return this.selectionPatterns.push(a),this.selectionPatterns.length>this.options.historySize&&(this.selectionPatterns.shift(),this.calculateVariance(this.selectionPatterns)<this.options.minVariance)?!0:(this.lastSelectionPosition=s,!1)}calculateVariance(t){if(t.length===0)return 0;const e=t.reduce((i,o)=>i+o,0)/t.length;return t.reduce((i,o)=>i+Math.pow(o-e,2),0)/t.length}cleanup(t){this.events=this.events.filter(e=>t-e.timestamp<=1e3)}clear(){this.events=[],this.selectionStartTime=0,this.lastSelectionTime=0,this.lastSelectionPosition=0,this.selectionPatterns=[],this.lastSelectedText=""}},Yo=class{match(t,e){for(const i of e)if(this.matchesCombo(t,i))return!0;return!1}matchesCombo(t,e){return t.keyCode===e.keyCode&&this.matchesModifier(t.ctrlKey,e.ctrl)&&this.matchesModifier(t.shiftKey,e.shift)&&this.matchesModifier(t.altKey,e.alt)&&this.matchesModifier(t.metaKey,e.meta)}matchesModifier(t,e){return e===void 0?!t:t===e}createKeyHandler(t,e){return i=>{this.match(i,t)&&(i.preventDefault(),i.stopPropagation(),e(i))}}createActivityEvent(t,e,i,o){let n,s;if(o){const a=o.getSelection(),h=a?.toString()||"",l=(h&&a?.rangeCount?a.getRangeAt(0)?.getClientRects():null)?.[0];l&&h&&(n={text:h,x:l.x,y:l.y,width:l.width,height:l.height});const c=o.document.activeElement;c&&c!==o.document.body&&(s=ti(c)?.outerHTML)}return{type:e,timestamp:Date.now(),key:t.key,code:t.code,keyCode:t.keyCode,ctrlKey:t.ctrlKey,altKey:t.altKey,shiftKey:t.shiftKey,metaKey:t.metaKey,targetFrameSrc:i,selectedText:n,interactiveElement:s}}createKeyboardHandlers(t,e,i,o){const n=[];return e.forEach(s=>{n.push(...s.keyCombos.map(a=>({...a,handler:h=>{const l=s.type,c=this.createActivityEvent(h,l,t,o);i(c)}})))}),n}createUnifiedHandler(t,e,i,o){const n=this.createKeyboardHandlers(t,e,i,o);return s=>{if(s.isTrusted){for(const a of n)if(this.match(s,[a])){const h=a.suppressOnInteractiveElement;if(h){const l=(o?.document??document).activeElement;if(Array.isArray(h)?h.some(c=>l?.matches(c)):Ao(l))return}s.preventDefault(),s.stopPropagation(),a.handler(s);return}}}}};const qo=class Gt extends Mt{constructor(){super(...arguments),this.configApplied=!1,this.cleanupCallbacks=[],this.pointerMoved=!1,this.isContextMenuEnabled=!1,this.isDragAndDropEnabled=!1,this.isSelectionMonitoringEnabled=!1,this.isBulkCopyProtectionEnabled=!1,this.selectionAnalyzer=null,this.currentSelection=null,this.bulkCopyProtector=null,this.keyManager=new Yo,this.keyDownHandler=null,this.preventBulkCopy=t=>{if(!this.isBulkCopyProtectionEnabled||!this.bulkCopyProtector)return!0;if(!this.bulkCopyProtector.shouldAllowCopy(t)){t.preventDefault();const e=this.wnd.getSelection(),i=e?.toString()||"",o=(i?e?.getRangeAt(0)?.getClientRects():null)?.[0],n={type:"bulk_copy",timestamp:Date.now(),clipboardTypes:t.clipboardData?.types?[...t.clipboardData.types]:[],selectedText:o?{text:i,x:o.x,y:o.y,width:o.width,height:o.height}:void 0,selectionLength:i.length,targetFrameSrc:this.wnd.location.href};return this.comms?.send("content_protection",n),!1}return!0},this.handleSelection=t=>{if(!this.isSelectionMonitoringEnabled||!this.wnd||!this.selectionAnalyzer)return;const e=this.wnd.getSelection();if(e){if(this.currentSelection=e.toString(),this.selectionAnalyzer.analyze(e)&&this.currentSelection){const i=this.wnd.getSelection(),o=i?.toString()||"",n=(o&&i?.rangeCount?i.getRangeAt(0)?.getClientRects():null)?.[0],s={type:"suspicious_selection",timestamp:Date.now(),selectionLength:o.length,selectedText:{text:o,x:n?.x??0,y:n?.y??0,width:n?.width??0,height:n?.height??0},eventType:t?.type||"selectionchange",targetFrameSrc:this.wnd.location.href};this.comms?.send("content_protection",s)}}else this.currentSelection=null},this.onDragOver=t=>{this.isDragAndDropEnabled&&(t.preventDefault(),t.stopPropagation())},this.onDragStart=t=>{if(this.isDragAndDropEnabled){t.preventDefault();const e={type:"drag_detected",timestamp:Date.now(),dataTransferTypes:t.dataTransfer?.types?[...t.dataTransfer.types]:[],targetFrameSrc:this.wnd.location.href};return this.comms?.send("content_protection",e),!1}else return!0},this.onDrop=t=>{if(this.isDragAndDropEnabled){t.preventDefault();const e=t.dataTransfer,i={type:"drop_detected",timestamp:Date.now(),dataTransferTypes:e?.types?[...e.types]:[],fileCount:e?.files?.length||0,targetFrameSrc:this.wnd.location.href};return this.comms?.send("content_protection",i),!1}else return!0},this.onContext=t=>{if(this.isContextMenuEnabled){t.preventDefault();const e=this.wnd.getSelection(),i=e?.toString()||"",o=(i&&e?.rangeCount?e.getRangeAt(0)?.getClientRects():null)?.[0],n={timestamp:Date.now(),clientX:t.clientX,clientY:t.clientY,...o&&{selectedText:{text:i,x:o.x,y:o.y,width:o.width,height:o.height}},targetFrameSrc:this.wnd.location.href};this.comms?.send("context_menu",n)}},this.onPointerUp=this.onPointUp.bind(this),this.onPointerMove=this.onPointMove.bind(this),this.onPointerDown=this.onPointDown.bind(this),this.onClicker=this.onClick.bind(this)}addContextMenuPrevention(){this.isContextMenuEnabled||!this.wnd||(this.wnd.document.addEventListener("contextmenu",this.onContext),this.isContextMenuEnabled=!0)}removeContextMenuPrevention(){!this.isContextMenuEnabled||!this.wnd||(this.wnd.document.removeEventListener("contextmenu",this.onContext),this.isContextMenuEnabled=!1)}addDragAndDropPrevention(){this.isDragAndDropEnabled||!this.wnd||(this.wnd.document.addEventListener("dragstart",this.onDragStart),this.wnd.document.addEventListener("dragover",this.onDragOver),this.wnd.document.addEventListener("drop",this.onDrop),this.isDragAndDropEnabled=!0)}removeDragAndDropPrevention(){!this.isDragAndDropEnabled||!this.wnd||(this.wnd.document.removeEventListener("dragstart",this.onDragStart),this.wnd.document.removeEventListener("dragover",this.onDragOver),this.wnd.document.removeEventListener("drop",this.onDrop),this.isDragAndDropEnabled=!1)}enableKeyboardPeripherals(t=[]){this.disableKeyboardPeripherals();const e=i=>{this.comms?.send("keyboard_peripherals",i)};this.keyDownHandler=this.keyManager.createUnifiedHandler(this.wnd.location.href,t,e,this.wnd),this.wnd&&this.wnd.document.addEventListener("keydown",this.keyDownHandler,{capture:!0})}disableKeyboardPeripherals(){this.wnd&&this.keyDownHandler&&(this.wnd.document.removeEventListener("keydown",this.keyDownHandler,{capture:!0}),this.keyDownHandler=null)}addBulkCopyProtection(t={}){if(this.isBulkCopyProtectionEnabled||!this.wnd)return;const e=Oa,i=t?{...e,...t}:e;this.bulkCopyProtector=new Wa(this.wnd,i),this.wnd.document.addEventListener("copy",this.preventBulkCopy,!0),this.wnd.document.addEventListener("cut",this.preventBulkCopy,!0),this.isBulkCopyProtectionEnabled=!0}removeBulkCopyProtection(){!this.isBulkCopyProtectionEnabled||!this.wnd||(this.wnd.document.removeEventListener("copy",this.preventBulkCopy,!0),this.wnd.document.removeEventListener("cut",this.preventBulkCopy,!0),this.bulkCopyProtector?.destroy(),this.bulkCopyProtector=null,this.isBulkCopyProtectionEnabled=!1)}addSelectionMonitoring(t){if(this.isSelectionMonitoringEnabled||!this.wnd)return;const e=t||Io;this.selectionAnalyzer=new Ba(e),this.wnd.document.addEventListener("selectionchange",this.handleSelection),this.isSelectionMonitoringEnabled=!0}removeSelectionMonitoring(){!this.isSelectionMonitoringEnabled||!this.wnd||(this.wnd.document.removeEventListener("selectionchange",this.handleSelection),this.selectionAnalyzer?.clear(),this.selectionAnalyzer=null,this.isSelectionMonitoringEnabled=!1)}onPointUp(t){const e=this.wnd.getSelection();if(e&&e.toString()?.length>0){const o=e.getRangeAt(0)?.getClientRects();if(!o||o.length===0)return;const n=o[0],s={text:e.toString(),x:n.x,y:n.y,width:n.width,height:n.height,targetFrameSrc:this.wnd?.location?.href};this.comms.send("text_selected",s)}if(this.pointerMoved){this.pointerMoved=!1;return}if(!e?.isCollapsed||!t.isPrimary)return;const i=this.wnd.devicePixelRatio;t.preventDefault(),this.comms.send(t.pointerType==="touch"?"tap":"click",{defaultPrevented:t.defaultPrevented,x:t.clientX*i,y:t.clientY*i,targetFrameSrc:this.wnd.location.href,targetElement:t.target.outerHTML,interactiveElement:ti(t.target)?.outerHTML,cssSelector:this.wnd._readium_cssSelectorGenerator.getCssSelector(t.target),onContent:this.isOnContent(t.target,t.clientX,t.clientY)}),this.pointerMoved=!1}onPointMove(t){if(t.movementY!==void 0&&t.movementX!==void 0){(Math.abs(t.movementX)>1||Math.abs(t.movementY)>1)&&(this.pointerMoved=!0);return}this.pointerMoved=!0}onPointDown(){this.pointerMoved=!1}onClick(t){if(t.preventDefault(),!t.isTrusted){const e=new PointerEvent("pointerup",{isPrimary:!0,pointerType:"mouse",clientX:t.clientX,clientY:t.clientY});Object.defineProperty(e,"target",{writable:!1,value:t.target}),Object.defineProperty(e,"defaultPrevented",{writable:!1,value:t.defaultPrevented}),this.onPointUp(e)}}isOnContent(t,e,i){if(t.closest("img, svg, video, audio, canvas, object"))return!0;const o=this.wnd.document.createRange();for(const n of Array.from(t.childNodes))if(!(n.nodeType!==Node.TEXT_NODE||!n.textContent?.trim())&&(o.selectNodeContents(n),Array.from(o.getClientRects()).some(s=>dt(s,e,i,0))))return!0;return!1}pointedPiece({cssSelector:t,x:e,y:i,pieces:o}){const n=this.wnd.document.querySelector(t);if(!n)return-1;const s=this.wnd.document.createRange();s.selectNode(n);const a=this.wnd.devicePixelRatio;let h=-1;for(let l=0;l<o.length;l++){const[c,d]=o[l],u=Xe(this.wnd.document,new rt({href:this.wnd.location.href,type:"text/html",text:zt.deserialize(c),locations:d?new pt({otherLocations:new Map([["cssSelector",d]])}):void 0}));if(!(!u||!u.intersectsNode(n))){if(Lt(u,!1).some(m=>dt(m,e/a,i/a,0)))return l;h===-1&&u.compareBoundaryPoints(Range.START_TO_START,s)<=0&&u.compareBoundaryPoints(Range.END_TO_END,s)>=0&&(h=l)}}return h}registerPointedPiece(){this.comms.register("pointed_piece",Gt.moduleName,(t,e)=>{const i=t;this.comms.send("pointed_piece",{id:i.id,index:this.pointedPiece(i)}),e(!0)})}registerProtectionHandlers(){this.comms?.register("peripherals_protection",Gt.moduleName,(t,e)=>{const i=t;if(!this.configApplied){if(this.configApplied=!0,i.monitorSelection){const o=typeof i.monitorSelection=="boolean"?void 0:i.monitorSelection;this.addSelectionMonitoring(o),this.comms?.log("Selection monitoring enabled")}typeof i.protectCopy=="object"?(this.addBulkCopyProtection({enabled:!0,...i.protectCopy}),this.comms?.log("Copy protection enabled (limited)")):i.protectCopy===!0&&(this.addBulkCopyProtection({enabled:!0,maxSelectionPercent:0,minThreshold:0,absoluteMaxChars:0}),this.comms?.log("Copy protection enabled")),i.disableContextMenu&&(this.addContextMenuPrevention(),this.comms?.log("Context menu protection enabled")),i.disableDragAndDrop&&(this.addDragAndDropPrevention(),this.comms?.log("Drag and drop protection enabled"))}e(!0)}),this.comms?.register("unfocus",Gt.moduleName,(t,e)=>{this.disableKeyboardPeripherals(),e(!0)}),this.comms?.register("keyboard_peripherals",Gt.moduleName,(t,e)=>{const i=t;i&&i.length>0&&(this.enableKeyboardPeripherals(i),this.comms?.log(`Keyboard peripherals enabled: ${i.map(o=>o.type).join(", ")}`)),e(!0)})}mount(t,e){return this.wnd=t,this.comms=e,this.registerProtectionHandlers(),this.registerPointedPiece(),t.document.addEventListener("pointerdown",this.onPointerDown),t.document.addEventListener("pointerup",this.onPointerUp),t.document.addEventListener("pointermove",this.onPointerMove),t.document.addEventListener("click",this.onClicker),e.log("Peripherals Mounted"),!0}unmount(t,e){return this.removeBulkCopyProtection(),this.removeSelectionMonitoring(),this.removeContextMenuPrevention(),this.removeDragAndDropPrevention(),this.disableKeyboardPeripherals(),this.cleanupCallbacks.forEach(i=>i()),this.cleanupCallbacks=[],t.document.removeEventListener("pointerdown",this.onPointerDown),t.document.removeEventListener("pointerup",this.onPointerUp),t.document.removeEventListener("pointermove",this.onPointerMove),t.document.removeEventListener("click",this.onClicker),e.unregisterAll(Gt.moduleName),this.configApplied=!1,e.log("Peripherals Unmounted"),!0}};qo.moduleName="peripherals";let ja=qo;const Zo=class xi extends Mt{constructor(){super(...arguments),this.mediaPlayingCount=0,this.allAnimations=new Set}wndOnErr(t){this.comms?.send("error",{message:t.message,filename:t.filename,lineno:t.lineno,colno:t.colno})}unblock(t){for(t._readium_blockEvents=!1;t._readium_blockedEvents?.length>0;){const e=t._readium_blockedEvents.shift();switch(e[0]){case 0:Reflect.apply(e[1],e[2],e[3]);break;case 1:const i=e[1],o=e[2];t.removeEventListener(i.type,t._readium_eventBlocker,!0);const n=new Event(i.type,{bubbles:i.bubbles,cancelable:i.cancelable});o?o.dispatchEvent(n):t.dispatchEvent(n);break}}}onMediaPlayEvent(){this.mediaPlayingCount++,this.comms?.send("media_play",this.mediaPlayingCount)}onMediaPauseEvent(){this.mediaPlayingCount>0&&this.mediaPlayingCount--,this.comms?.send("media_pause",this.mediaPlayingCount)}pauseAllMedia(t){const e=t.document.querySelectorAll("audio,video");for(let i=0;i<e.length;i++)e[i].pause()}mount(t,e){this.comms=e,t.addEventListener("error",this.wndOnErr,!1),Reflect.defineProperty(t.navigator,"epubReadingSystem",{value:{name:"readium-ts-toolkit",version:"2.10.1",hasFeature:(o,n="")=>{switch(o){case"dom-manipulation":return!0;case"layout-changes":return!0;case"touch-events":return!0;case"mouse-events":return!0;case"keyboard-events":return!0;case"spine-scripting":return!0;case"embedded-web-content":return!0;default:return!1}}},writable:!1}),"getAnimations"in t.document&&t.document.getAnimations().forEach(o=>{o.cancel(),this.allAnimations.add(o)}),e.register("activate",xi.moduleName,(o,n)=>{this.allAnimations.forEach(s=>{s.cancel(),s.play()}),n(!0)}),e.register("unfocus",xi.moduleName,(o,n)=>{this.pauseAllMedia(t),this.allAnimations.forEach(s=>s.pause()),n(!0)});const i=t.document.querySelectorAll("audio,video");for(let o=0;o<i.length;o++){const n=i[o];n.addEventListener("play",this.onMediaPlayEvent,{passive:!0}),n.addEventListener("pause",this.onMediaPauseEvent,{passive:!0})}return e.log("Setup Mounted"),!0}unmount(t,e){return t.removeEventListener("error",this.wndOnErr),t.removeEventListener("play",this.onMediaPlayEvent),t.removeEventListener("pause",this.onMediaPauseEvent),this.allAnimations.forEach(i=>i.cancel()),this.allAnimations.clear(),e.log("Setup Unmounted"),!0}};Zo.moduleName="setup";let Jo=Zo;const Qo="readium-viewport",tn=class Et extends Jo{onViewportWidthChanged(t){const e=t.target;Qt(e,"--RS__viewportWidth",`${e.innerWidth}px`)}mount(t,e){if(!super.mount(t,e))return!1;const i=t.document.createElement("meta");return i.dataset.readium="true",i.setAttribute("name","viewport"),i.setAttribute("id",Qo),i.setAttribute("content","width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no"),t.document.head.appendChild(i),t.addEventListener("orientationchange",this.onViewportWidthChanged),t.addEventListener("resize",this.onViewportWidthChanged),this.onViewportWidthChanged({target:t}),e.register("get_properties",Et.moduleName,(o,n)=>{Qe(t),n(!0)}),e.register("update_properties",Et.moduleName,(o,n)=>{o["--RS__viewportWidth"]=`${t.innerWidth}px`,Lo(t,o),n(!0)}),e.register("set_property",Et.moduleName,(o,n)=>{const s=o;Qt(t,s[0],s[1]),n(!0)}),e.register("remove_property",Et.moduleName,(o,n)=>{ye(t,o),n(!0)}),e.register("activate",Et.moduleName,(o,n)=>{this.unblock(t),n(!0)}),e.log("ReflowableSetup Mounted"),!0}unmount(t,e){return e.unregisterAll(Et.moduleName),t.document.head.querySelector(`#${Qo}`)?.remove(),t.removeEventListener("orientationchange",this.onViewportWidthChanged),e.log("ReflowableSetup Unmounted"),super.unmount(t,e)}};tn.moduleName="reflowable_setup";let Ga=tn;const en="readium-fixed-style",on=class bt extends Jo{mount(t,e){if(!super.mount(t,e))return!1;t.navigator.epubReadingSystem&&(t.navigator.epubReadingSystem.layoutStyle="paginated");const i=t.document.createElement("style");return i.id=en,i.dataset.readium="true",i.textContent=`
        html, body {
            text-size-adjust: none;
            -ms-text-size-adjust: none;
            -webkit-text-size-adjust: none;
            -moz-text-size-adjust: none;

            /* Fight Safari pinches */
            touch-action: none !important;
            min-height: 100%;

            /*cursor: var() TODO*/
        }`,t.document.head.appendChild(i),e.register("set_property",bt.moduleName,(o,n)=>{const s=o;Qt(t,s[0],s[1]),n(!0)}),e.register("remove_property",bt.moduleName,(o,n)=>{ye(t,o),n(!0)}),e.register("first_visible_locator",bt.moduleName,(o,n)=>n(!1)),e.register("unfocus",bt.moduleName,(o,n)=>{N(t),n(!0)}),e.register(["focus","go_next","go_prev","go_id","go_end","go_start","go_text","go_progression"],bt.moduleName,(o,n)=>n(!0)),e.register("activate",bt.moduleName,(o,n)=>{this.unblock(t),n(!0)}),e.log("FixedSetup Mounted"),!0}unmount(t,e){return e.unregisterAll(bt.moduleName),t.document.getElementById(en)?.remove(),e.log("FixedSetup Unmounted"),super.unmount(t,e)}};on.moduleName="fixed_setup";let Va=on;const nn=["div","span","p","br","hr","b","i","em","strong","s","u","mark","small","sub","sup","abbr","cite","code","data","dfn","kbd","q","samp","time","var","blockquote","pre","svg","g","path","circle","ellipse","rect","line","polygon","polyline","text","tspan","defs","use"],Xa=/^on/i,Ka=new Set(["href","src","action","formaction","xlink:href"]),Ya=/^\s*(javascript|data):/i;function qa(r,t){const e=r.document.createElement("div");if("Sanitizer"in r&&typeof e.setHTML=="function")try{const o=new r.Sanitizer({allowElements:nn});return e.setHTML(t,{sanitizer:o}),e.firstElementChild}catch{}const i=r.document.implementation.createHTMLDocument("");for(i.body.innerHTML=t,Za(i.body,new Set(nn));i.body.firstChild;)e.appendChild(r.document.adoptNode(i.body.firstChild));return e.firstElementChild}function Za(r,t){const e=Array.from(r.querySelectorAll("*")).reverse();for(const i of e){if(!t.has(i.localName)){i.replaceWith(...Array.from(i.childNodes));continue}for(const{name:o,value:n}of Array.from(i.attributes))(Xa.test(o)||Ka.has(o)&&Ya.test(n))&&i.removeAttribute(o)}}function ii(r){switch(r){case C.Mask:return"rgba(255, 255, 255, 0.5)";case C.Highlight:case C.HighlightUnderline:return"#FFFF00";default:return"#FF0000"}}const C={Highlight:"highlight",HighlightUnderline:"highlightUnderline",Underline:"underline",Strikethrough:"strikethrough",Outline:"outline",TextColor:"textColor",Mask:"mask",Template:"template"};var Ja=(r=>(r.Wrap="wrap",r.Viewport="viewport",r.Bounds="bounds",r.Page="page",r))(Ja||{}),Qa=(r=>(r.Boxes="boxes",r.Bounds="bounds",r))(Qa||{}),tl=(r=>(r.Solid="solid",r.Dashed="dashed",r.Dotted="dotted",r.Wavy="wavy",r))(tl||{});const el=()=>"Highlight"in window,oi=["IMG","IMAGE","AUDIO","VIDEO","SVG"],il=[...oi,"IFRAME","OBJECT","EMBED","CANVAS"],ol=new Set(["SUP","SUB","SMALL","CODE"]),nl=2,ve=1,rn=.1;let rl=class Q{constructor(t,e,i,o){this.wnd=t,this.comms=e,this.id=i,this.name=o,this.items=[],this.lastItemId=0,this.container=void 0,this._activatable=!1,this._hoverable=!1,this.hoveredItem=void 0,this.experimentalHighlights=!1,this._tintSubKeys=new Map,this._subKeyCounter=0,this.pendingWebkitReflow=null,this.maskSvg=void 0,this.shadowHost=void 0,this.shadowRoot=void 0,this.currentRender=0,this.pendingRender=new Set,this.maskFrame=0,el()&&(this.experimentalHighlights=!0,this.notTextFlag=new Map),this.activationHandler=this.handleActivation.bind(this),this.wnd.document.addEventListener("pointerup",this.activationHandler),this.hoverHandler=this.handleHover.bind(this),this.wnd.document.addEventListener("pointermove",this.hoverHandler)}get activatable(){return this._activatable}set activatable(t){this._activatable=t}get hoverable(){return this._hoverable}get hasOverlayItems(){return!this.experimentalHighlights||(this.notTextFlag?.size??0)>0}set hoverable(t){if(this._hoverable=t,!t&&this.hoveredItem){const e=this.hoveredItem.range.getBoundingClientRect(),i=this.wnd.devicePixelRatio;this.comms.send("decoration_pointer_leave",{decorationId:this.hoveredItem.decoration.id,group:this.name,rect:{top:e.top*i,left:e.left*i,width:e.width*i,height:e.height*i}}),this.hoveredItem=void 0}}add(t){const e=`${this.id}-${this.lastItemId++}`,i=Xe(this.wnd.document,t.locator);if(!i){this.comms.log("Can't locate DOM range for decoration",t);return}const o=i.commonAncestorContainer;if(o.nodeType!==Node.TEXT_NODE&&this.experimentalHighlights&&(oi.includes(o.nodeName.toUpperCase())&&this.notTextFlag?.set(e,!0),i.cloneContents().querySelector(oi.join(", ").toLowerCase())&&this.notTextFlag?.set(e,!0),(o.textContent?.trim()||"").length===0&&this.notTextFlag?.set(e,!0)),this.experimentalHighlights&&!this.notTextFlag?.has(e)){const s=a=>{for(;a&&a.nodeType===Node.ELEMENT_NODE;){if(a.namespaceURI?.includes("svg"))return!0;a=a.parentNode}return!1};(s(i.startContainer)||s(i.endContainer))&&this.notTextFlag?.set(e,!0)}if(this.experimentalHighlights){const{type:s}=t.style,{layout:a,width:h,expand:l,thickness:c,lineStyle:d}=t.style;s!==C.TextColor&&(s===C.Outline||s===C.Template||s===C.Mask||a!==void 0&&a!=="boxes"||h!==void 0&&h!=="wrap"||l||X.UA.WebKit&&s!==C.Highlight&&(c!==void 0||d&&d!=="solid")||X.UA.Blink&&To(this.wnd)&&(s===C.Underline||s===C.HighlightUnderline))&&this.notTextFlag?.set(e,!0)}const n={decoration:t,id:e,range:i,hitRects:[],clickableElements:void 0,container:void 0};this.items.push(n),this.layout(n),n.hitRects=this.clientRectsToDocCoords(Lt(n.range,!1,!1,this.scaledExpand(n.decoration.style)+this.hitGap())),this.renderLayout([n])}remove(t){const e=this.items.findIndex(n=>n.decoration.id===t);if(e<0)return;const i=this.items[e],o=i.decoration.style?.type===C.Mask;if(this.items.splice(e,1),i.clickableElements=void 0,i.container&&(i.container.remove(),i.container=void 0),this.experimentalHighlights&&!this.notTextFlag?.has(i.id)&&i.highlightSubKey){const n=this.wnd.CSS.highlights;n.get(i.highlightSubKey)?.delete(i.range),this.items.some(a=>a.highlightSubKey===i.highlightSubKey)||n.delete(i.highlightSubKey);const s=this.wnd.document.getElementById(`${this.id}-style`);s&&this._rebuildHighlightStylesheet(s),this.scheduleWebkitRepaintFix([i])}this.notTextFlag?.delete(i.id),this.hoveredItem===i&&(this.hoveredItem=void 0),o&&this.scheduleMaskUpdate()}update(t){this.remove(t.id),this.add(t)}clear(){this.experimentalHighlights&&this.scheduleWebkitRepaintFix(this.items),this.clearContainer(),this.items.length=0,this.notTextFlag?.clear(),this.hoveredItem=void 0,this.maskSvg?this.scheduleMaskUpdate():this.removeShadowHost()}destroy(){this.clear(),this.wnd.cancelAnimationFrame(this.maskFrame),this.maskFrame=0,this.maskSvg?.remove(),this.maskSvg=void 0,this.removeShadowHost(),this.wnd.document.removeEventListener("pointerup",this.activationHandler),this.wnd.document.removeEventListener("pointermove",this.hoverHandler)}isWebkitRepaintProne(t){const e=this.wnd.getComputedStyle(t);if(ol.has(t.tagName.toUpperCase())||e.display==="inline-block"||e.verticalAlign!=="baseline")return!0;const i=t.parentElement?this.wnd.getComputedStyle(t.parentElement):null;return!!i&&parseFloat(e.fontSize)!==parseFloat(i.fontSize)}findWebkitRepaintProneElement(t){let e=t.startContainer.nodeType===Node.ELEMENT_NODE?t.startContainer:t.startContainer.parentElement;for(;e;){if(this.isWebkitRepaintProne(e))return e;if(this.wnd.getComputedStyle(e).display!=="inline")break;e=e.parentElement}const i=t.commonAncestorContainer,o=i.nodeType===Node.ELEMENT_NODE?i:i.parentElement;if(!o)return null;const n=this.wnd.document.createTreeWalker(o,NodeFilter.SHOW_ELEMENT,s=>t.intersectsNode(s)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT);for(let s=n.nextNode();s;s=n.nextNode())if(this.isWebkitRepaintProne(s))return s;return null}forceWebkitBlockReflow(t){let e=t;for(;e;){const s=this.wnd.getComputedStyle(e).display;if(s!=="inline"&&s!=="inline-block")break;e=e.parentElement}if(!e||!e.isConnected)return;const i=e,o=i.style.getPropertyValue("transform"),n=i.style.getPropertyPriority("transform");i.style.setProperty("transform","translateZ(0.001px)","important"),i.offsetHeight,i.style.setProperty("transform","translateZ(0px)","important"),i.offsetHeight,o?i.style.setProperty("transform",o,n):i.style.removeProperty("transform")}scheduleWebkitRepaintFix(t){if(X.UA.WebKit)for(const e of t){if(this.notTextFlag?.has(e.id)||!e.highlightSubKey)continue;const i=this.findWebkitRepaintProneElement(e.range);i&&this.queueWebkitReflow(i)}}queueWebkitReflow(t){this.pendingWebkitReflow||(this.pendingWebkitReflow=new Set,this.wnd.requestAnimationFrame(()=>{const e=this.pendingWebkitReflow;this.pendingWebkitReflow=null,e?.forEach(i=>this.forceWebkitBlockReflow(i))})),this.pendingWebkitReflow.add(t)}clientRectsToDocCoords(t,e=Nt(this.wnd)){const i=e.xDocOffset,o=e.yDocOffset;return i===0&&o===0?t:t.map(n=>({left:n.left+i,top:n.top+o,right:n.right+i,bottom:n.bottom+o,width:n.width,height:n.height}))}pointerToDocCoords(t){const e=Nt(this.wnd);return{docX:t.clientX+e.xDocOffset,docY:t.clientY+e.yDocOffset}}effectiveZoom(){if(!X.UA.Blink)return 1;const t=parseFloat(this.wnd.getComputedStyle(this.wnd.document.documentElement).zoom),e=parseFloat(this.wnd.getComputedStyle(this.wnd.document.body).zoom);return(t||1)*(e||1)}hitGap(){return 2*this.effectiveZoom()}scaledExpand(t){return(t.expand??0)*this.effectiveZoom()}handleActivation(t){if(!this._activatable)return;const{docX:e,docY:i}=this.pointerToDocCoords(t),o=this.wnd.devicePixelRatio;for(const n of this.items){let s;if(n.decoration.style.type===C.Template)for(const a of n.clickableElements??[]){const h=a.getBoundingClientRect();if(dt(h,t.clientX,t.clientY,0)){s=h;break}}else for(const a of n.hitRects)if(dt(a,e,i,0)){s=n.range.getBoundingClientRect();break}if(s){this.comms.send("decoration_activated",{decorationId:n.decoration.id,group:this.name,rect:{top:s.top*o,left:s.left*o,width:s.width*o,height:s.height*o},point:{x:t.clientX*o,y:t.clientY*o}});return}}}handleHover(t){if(!this._hoverable)return;const{docX:e,docY:i}=this.pointerToDocCoords(t),o=this.wnd.devicePixelRatio;let n,s;for(const a of this.items){if(a.decoration.style.type===C.Template)for(const h of a.clickableElements??[]){const l=h.getBoundingClientRect();if(dt(l,t.clientX,t.clientY,0)){n=a,s=l;break}}else for(const h of a.hitRects)if(dt(h,e,i,0)){n=a,s=a.range.getBoundingClientRect();break}if(n)break}if(n!==this.hoveredItem){if(this.hoveredItem){const a=this.hoveredItem.range.commonAncestorContainer.isConnected?this.hoveredItem.range.getBoundingClientRect():null;this.comms.send("decoration_pointer_leave",{decorationId:this.hoveredItem.decoration.id,group:this.name,rect:a?{top:a.top*o,left:a.left*o,width:a.width*o,height:a.height*o}:void 0,point:{x:t.clientX*o,y:t.clientY*o}})}this.hoveredItem=n,n&&s&&this.comms.send("decoration_pointer_enter",{decorationId:n.decoration.id,group:this.name,rect:{top:s.top*o,left:s.left*o,width:s.width*o,height:s.height*o},point:{x:t.clientX*o,y:t.clientY*o}})}}requestLayout(){this.wnd.cancelAnimationFrame(this.currentRender),this.clearContainer(),this.wnd.document.fonts.ready.then(()=>{this.currentRender=this.wnd.requestAnimationFrame(()=>{this.items.forEach(t=>{this.layout(t),t.hitRects=this.clientRectsToDocCoords(Lt(t.range,!1,!1,this.scaledExpand(t.decoration.style)+this.hitGap()))}),this.renderLayout(this.items)})})}repositionOverlays(){const t=[],e=Nt(this.wnd);let i;this.items.forEach(o=>{if(!(this.experimentalHighlights&&!this.notTextFlag?.has(o.id))){if(o.decoration.style?.type===C.Mask){this.scheduleMaskUpdate();return}this.repositionItem(o,i??(i=this.overlayContext()))||(o.container?.remove(),this.layout(o),t.push(o)),o.hitRects=this.clientRectsToDocCoords(Lt(o.range,!1,!1,this.scaledExpand(o.decoration.style)+this.hitGap()),e)}}),t.length&&this.renderLayout(t)}experimentalLayout(t){const e=this.requireContainer(!0),i=this.wnd.CSS.highlights,o=t.decoration.style,n=o.type??C.Highlight,s=o.tint??ii(n),a=o.width,h=o.layout,l=this._getSubKey(n,s,o.thickness,o.lineStyle);t.highlightSubKey&&(i.get(t.highlightSubKey)?.delete(t.range),t.highlightSubKey!==l&&!this.items.some(g=>g!==t&&g.highlightSubKey===t.highlightSubKey)&&i.delete(t.highlightSubKey)),t.highlightSubKey=l;let c;i.has(l)?c=i.get(l):(c=new this.wnd.Highlight,i.set(l,c));const d=(g,f)=>this.wnd.document.caretPositionFromPoint?.(g,f)??null;if(n===C.TextColor&&(h==="bounds"||a==="bounds"||a==="page")){const g=Nt(this.wnd);if(g.isVertical)console.warn("Vertical writing detected: caretPositionFromPoint has known bugs, falling back to original range"),c.add(t.range);else{const f=t.range.getBoundingClientRect();let v,R;a==="page"?(v=Math.floor(g.inlineStart(f)/g.pageInlineSize)*g.pageInlineSize,R=g.pageInlineSize):(v=g.inlineStart(f),R=g.inlineSize(f));const E=t.range.commonAncestorContainer,P=E.nodeType===Node.ELEMENT_NODE?E:E.parentElement,F=ko(this.wnd,P),[x,W]=F?[v+R,v]:[v,v+R],I=d(x,g.blockStart(f)+1),Z=d(W,g.blockStart(f)+g.blockSize(f)-1),yt=this.wnd.document.createRange();I&&Z&&(yt.setStart(I.offsetNode,I.offset),yt.comparePoint(Z.offsetNode,Z.offset)<0?yt.setStart(Z.offsetNode,Z.offset):yt.setEnd(Z.offsetNode,Z.offset)),yt.collapsed?c.add(t.range):(c.add(yt),t.range=yt)}}else c.add(t.range);const u=this.getBackgroundColor(),m=o.enforceContrast!==!1?wt(s,u):s,p=o.thickness===void 0?`${rn}em`:`${o.thickness}px`,S=o.lineStyle??"solid";let y;switch(n){case C.Underline:y=`::highlight(${l}) {
                    text-decoration: underline;
                    text-decoration-color: ${m};
                    text-decoration-thickness: ${p};
                    text-decoration-style: ${S};
                }`;break;case C.Strikethrough:y=`::highlight(${l}) {
                    text-decoration: line-through;
                    text-decoration-color: ${m};
                    text-decoration-thickness: ${p};
                    text-decoration-style: ${S};
                }`;break;case C.Outline:y=`::highlight(${l}) {
                    outline: 2px solid ${m};
                    outline-offset: 1px;
                }`;break;case C.TextColor:{const g=o.thickness?o.thickness/2:0,[f,v]=Nt(this.wnd).isVertical?[0,g]:[g,0];y=`::highlight(${l}) {
                    color: ${m};${g?`
                    text-shadow: ${f}px ${v}px 0 ${m}, ${-f}px ${-v}px 0 ${m};`:""}
                }`;break}case C.HighlightUnderline:{const{r:g,g:f,b:v}=vt(m),R=`rgba(${g}, ${f}, ${v}, 0.3)`;y=`::highlight(${l}) {
                    color: ${Li(R,u)};
                    background-color: ${R};
                    text-decoration: underline;
                    text-decoration-color: ${m};
                    text-decoration-thickness: ${p};
                    text-decoration-style: ${S};
                }`;break}case C.Highlight:default:y=`::highlight(${l}) {
                    color: ${Li(m,u)};
                    background-color: ${m};
                }`}t.highlightCSS=y,this._rebuildHighlightStylesheet(e)}_getSubKey(t,e,i,o){const n=`${t}::${e}::${i??""}::${o??""}`;let s=this._tintSubKeys.get(n);return s||(s=`${this.id}--${this._subKeyCounter++}`,this._tintSubKeys.set(n,s)),s}_rebuildHighlightStylesheet(t){const e=new Set,i=[];for(const o of this.items)o.highlightSubKey&&o.highlightCSS&&!e.has(o.highlightSubKey)&&(e.add(o.highlightSubKey),i.push(o.highlightCSS));t.innerHTML=i.join(`
`)}positionElement(t,e,i,o,n,s,a=0){const[h,l,c,d]=this.overlayBox(t,e,n,s,a);e.applyPosition(o,h,l,c,d,i)}overlayBox(t,e,i,o,n=0){const s=t.decoration?.style?.width,a=i;switch(s){case"viewport":return[Math.floor(e.inlineStart(a)/e.viewportInlineSize)*e.viewportInlineSize+e.inlineScrollOffset+n,e.blockStart(a)+e.blockScrollOffset,e.viewportInlineSize-2*n,e.blockSize(a)];case"page":return[Math.floor(e.inlineStart(a)/e.pageInlineSize)*e.pageInlineSize+e.inlineScrollOffset+n,e.blockStart(a)+e.blockScrollOffset,e.pageInlineSize-2*n,e.blockSize(a)];case"bounds":return[e.inlineStart(o)+e.inlineScrollOffset,e.blockStart(a)+e.blockScrollOffset,e.inlineSize(o),e.blockSize(a)];default:return[e.inlineStart(a)+e.inlineScrollOffset,e.blockStart(a)+e.blockScrollOffset,e.inlineSize(a),e.blockSize(a)]}}static replacedContentRects(t){const e=t.commonAncestorContainer;return e.nodeType!==Node.ELEMENT_NODE?[]:Array.from(e.querySelectorAll(il.join(", ").toLowerCase())).filter(i=>t.intersectsNode(i)).flatMap(i=>Array.from(i.getClientRects())).map(({left:i,right:o,top:n,bottom:s,width:a,height:h})=>({left:i,right:o,top:n,bottom:s,width:a,height:h}))}static mergeLineRects(t,e,i){const o=l=>e.blockStart(l)+e.blockSize(l),n=l=>e.inlineStart(l)+e.inlineSize(l),s=(l,c)=>Math.min(o(l),o(c))-Math.max(e.blockStart(l),e.blockStart(c))>Math.min(e.blockSize(l),e.blockSize(c))/2&&Math.max(e.inlineStart(l),e.inlineStart(c))-Math.min(n(l),n(c))<=1,a=(l,c,d)=>{const u=Math.min(l.left,c.left),m=Math.max(l.right,c.right),p=Math.min(l.top,c.top),S=Math.max(l.bottom,c.bottom),y={left:u,right:m,top:p,bottom:S,width:m-u,height:S-p};return d?e.isVertical?{...y,left:d.left,right:d.right,width:d.width}:{...y,top:d.top,bottom:d.bottom,height:d.height}:y},h=[];for(const l of[...t].sort((c,d)=>e.inlineStart(c)-e.inlineStart(d))){const c=h.findIndex(u=>s(l,u));if(c<0){h.push(l);continue}const d=h[c];h[c]=a(d,l,i&&(e.blockSize(l)>e.blockSize(d)?l:d))}for(const l of i??[]){const c=h.findIndex(d=>s(l,d));c<0?h.push(l):h[c]=a(h[c],l,h[c])}return h}static isShapeOutline(t){const{lineStyle:e}=t;return t.type===C.Outline&&(t.layout!=="bounds"||e==="wavy"||Q.drawsOwnDots(e))}static drawsOwnDots(t){return!!X.UA.WebKit&&t==="dotted"}static dotImage(t,e){const i=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${e?"0 0 1 2":"0 0 2 1"}" preserveAspectRatio="none"><circle cx="0.5" cy="0.5" r="0.5" fill="${t}"/></svg>`;return`url('data:image/svg+xml,${encodeURIComponent(i)}')`}static waveImage(t,e){const[i,o]=e?["0 0 3 6","M1.5 0Q-0.5 1.5 1.5 3T1.5 6"]:["0 0 6 3","M0 1.5Q1.5 -0.5 3 1.5T6 1.5"],n=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${i}" preserveAspectRatio="none"><path d="${o}" fill="none" stroke="${t}" stroke-width="1" stroke-linecap="round"/></svg>`;return`url('data:image/svg+xml,${encodeURIComponent(n)}')`}underlineDeclarations(t,e,i,o,n,s){const a=this.underlineWidth(t),[h,l]=e.isVertical?["right","left"]:["bottom","top"],c=n?[h,l]:[h],d=["box-sizing: content-box !important"],u=o==="wavy";if(!u&&!Q.drawsOwnDots(o))return d.push(...c.map(f=>`border-${f}: ${a} ${o} ${i} !important`)),n&&d.push(`margin-${l}: calc(-1 * ${a}) !important`),d.push(s?`background: ${s} padding-box !important`:"background-color: transparent !important"),d;const m=u?`calc(3 * ${a})`:a,p=`calc(${u?6:2} * ${a})`;d.push(...c.map(f=>`padding-${f}: ${m} !important`)),n&&d.push(`margin-${l}: calc(-1 * ${m}) !important`);const S=u?Q.waveImage(i,e.isVertical):Q.dotImage(i,e.isVertical),y=c.map(f=>({position:e.isVertical?`${f} top`:`left ${f}`,size:e.isVertical?`${m} ${p}`:`${p} ${m}`,repeat:e.isVertical?"no-repeat round":"round no-repeat"})),g=s?[...y.map(f=>({...f,image:S,clip:"border-box"})),{image:`linear-gradient(${s}, ${s})`,position:"0 0",size:"auto",repeat:"no-repeat",clip:"content-box"}]:y.map(f=>({...f,image:S,clip:"border-box"}));return d.push(`background-image: ${g.map(f=>f.image).join(", ")} !important`,`background-position: ${g.map(f=>f.position).join(", ")} !important`,`background-size: ${g.map(f=>f.size).join(", ")} !important`,`background-repeat: ${g.map(f=>f.repeat).join(", ")} !important`,`background-clip: ${g.map(f=>f.clip).join(", ")} !important`,"background-color: transparent !important"),d}underlineWidth(t){const{thickness:e}=t.decoration.style;return e===void 0?`${rn}em`:`${e}px`}sizeStrikethroughPattern(t,e,i,o,n){const{type:s,layout:a,lineStyle:h}=t.decoration.style;if(s!==C.Strikethrough||a==="bounds"||!h||h==="solid")return;const l=e.blockSize(n)*i;if(h==="wavy"||Q.drawsOwnDots(h)){o.style.setProperty("background-size",e.isVertical?`${l}px ${l*2}px`:`${l*2}px ${l}px`,"important");return}o.style.setProperty(e.isVertical?"border-left-width":"border-top-width",`${l}px`,"important")}outlineMetrics(t){const e=t.decoration.style;if(e.type!==C.Outline)return{stroke:0,wave:0,inset:0};const i=e.thickness??nl,o=e.lineStyle==="wavy"?i:0,n=e.width==="page"||e.width==="viewport"?(i+ve+o*2)*this.effectiveZoom():0;return{stroke:i,wave:o,inset:n}}outlinePath(t,e,i,o,n,s,a,h){const l=e.isVertical&&!e.isVertLR?-1:1,c=o.map(m=>{const[p,S,y,g]=this.overlayBox(t,e,m,n,s).map(R=>R*i),f=p+y,v=S+g;return l===1?{i0:p,i1:f,b0:S,b1:v}:{i0:p,i1:f,b0:-v,b1:-S}}).sort((m,p)=>m.b0-p.b0),d=[];for(const m of c){const p=d.find(S=>{const y=S[S.length-1];return m.b0>y.b0&&m.b0-y.b1<Math.min(y.b1-y.b0,m.b1-m.b0)&&m.i0<y.i1&&m.i1>y.i0});p?p.push(m):d.push([m])}const u=(m,p)=>e.isVertical?`${p*l} ${m}`:`${m} ${p}`;return d.map(m=>{const p=m.length-1,S=f=>(m[f].b1+m[f+1].b0)/2,y=(f,v)=>S(f)+Math.sign(v)*a,g=[[m[0].i1+a,m[0].b0-a]];for(let f=0;f<p;f++){const v=y(f,m[f].i1-m[f+1].i1);g.push([m[f].i1+a,v],[m[f+1].i1+a,v])}g.push([m[p].i1+a,m[p].b1+a],[m[p].i0-a,m[p].b1+a]);for(let f=p-1;f>=0;f--){const v=y(f,m[f+1].i0-m[f].i0);g.push([m[f+1].i0-a,v],[m[f].i0-a,v])}return g.push([m[0].i0-a,m[0].b0-a]),h?Q.wavyPolygon(g,h,u):`M${g.map(([f,v])=>u(f,v)).join(" L")} Z`}).join(" ")}static wavyPolygon(t,e,i){const o=e*3;let n=`M${i(...t[0])}`;return t.forEach(([s,a],h)=>{const[l,c]=t[(h+1)%t.length],d=Math.hypot(l-s,c-a);if(d<o){n+=` L${i(l,c)}`;return}const u=Math.round(d/o),[m,p]=[(l-s)/u,(c-a)/u],[S,y]=[-(c-a)/d*e*2,(l-s)/d*e*2];for(let g=0;g<u;g++){const f=g%2?-1:1;n+=` Q${i(s+m*(g+.5)+S*f,a+p*(g+.5)+y*f)} ${i(s+m*(g+1),a+p*(g+1))}`}}),`${n} Z`}computeOverlayRects(t,e,i,o){if(t.decoration?.style?.layout==="bounds")return[o?{left:i.left-o,right:i.right+o,top:i.top-o,bottom:i.bottom+o,width:i.width+o*2,height:i.height+o*2}:i];const n=t.decoration.style,s=n.type,a=s===C.Underline||s===C.Strikethrough,h=s===C.Strikethrough,l=h?n.thickness:void 0,c=h&&n.lineStyle==="wavy";let d=t.range,u=[];if(a||s===C.Outline||s===C.HighlightUnderline){const p=Aa(t.range,["rt","rp"]);p.length&&(u=Q.replacedContentRects(t.range),d=a?p:[...p,...u])}let m=Q.mergeLineRects(Lt(d,!0,e.isVertical,a?0:o),e,a?u:void 0);return m=m.sort((p,S)=>e.isVertical?(e.isVertLR?1:-1)*(p.left-S.left):p.top-S.top),m.map(p=>{let S=p;if(h){const y=l!==void 0?l*this.effectiveZoom():e.blockSize(p)*.1,g=c?y*3:y,f=e.blockStart(p)+e.blockSize(p)/2-g/2;S=e.isVertical?{left:f,right:f+g,top:p.top,bottom:p.bottom,width:g,height:p.height}:{top:f,bottom:f+g,left:p.left,right:p.right,height:g,width:p.width}}if(o&&a){const y=o,g=h?0:o,[f,v]=e.isVertical?[g,y]:[y,g];S={left:S.left-f,right:S.right+f,top:S.top-v,bottom:S.bottom+v,width:S.width+f*2,height:S.height+v*2}}return S})}repositionItem(t,e){if(!t.container)return!0;const i=t.decoration.style;if(i.type!==C.Template){const d=i.type??C.Highlight;if(d===C.TextColor||d===C.Mask)return!0}const o=1/this.effectiveZoom(),n=this.scaledExpand(i),s=t.range.getBoundingClientRect(),a=this.outlineMetrics(t),h=a.inset,l=this.computeOverlayRects(t,e,s,n);if(Q.isShapeOutline(i))return t.container.querySelector("path")?.setAttribute("d",this.outlinePath(t,e,o,l,s,h,ve+a.stroke/2+a.wave,a.wave)),!0;const c=Array.from(t.container.children);return c.length!==l.length?!1:(c.forEach((d,u)=>{this.positionElement(t,e,o,d,l[u],s,h),this.sizeStrikethroughPattern(t,e,o,d,l[u])}),!0)}layout(t){if(this.experimentalHighlights&&!this.notTextFlag?.has(t.id))return this.experimentalLayout(t);const e=this.wnd.document.createElement("div");e.setAttribute("id",t.id),e.dataset.highlightId=t.decoration.id,e.style.setProperty("pointer-events","none");const i=this.overlayContext(),o=1/this.effectiveZoom(),n=this.scaledExpand(t.decoration.style),s=t.range.getBoundingClientRect(),a=t.decoration.style,h=this.outlineMetrics(t),l=h.inset;let c;if(a.type===C.Template){a.stylesheet&&this.injectCustomStylesheet(a.stylesheet);const u=qa(this.wnd,a.element);if(!u){t.container=e,t.clickableElements=[];return}u.style.setProperty("pointer-events","none"),c=u}else{const u=a,m=u.type??C.Highlight,p=u.tint??ii(m);if(m===C.TextColor){t.container=e,t.clickableElements=[];return}if(m===C.Mask){t.container=e,t.clickableElements=[],this.scheduleMaskUpdate();return}const S=this.getCurrentDarkMode(),y=this.getBackgroundColor(),g=u.enforceContrast!==!1,f=u.lineStyle??"solid";if(Q.isShapeOutline(u)){const E="http://www.w3.org/2000/svg",P=this.wnd.document.createElementNS(E,"svg");P.dataset.readium="true",P.style.cssText=`position:absolute;top:0;left:0;width:1px;height:1px;overflow:visible;writing-mode:horizontal-tb;pointer-events:none;z-index:${qe}`;const F=this.wnd.document.createElementNS(E,"path");F.setAttribute("fill","none"),F.setAttribute("stroke",g?wt(p,y):p),F.setAttribute("stroke-width",String(h.stroke)),f==="dashed"&&F.setAttribute("stroke-dasharray",`${h.stroke*3} ${h.stroke*2}`),f==="dotted"&&(F.setAttribute("stroke-dasharray",`0 ${h.stroke*2}`),F.setAttribute("stroke-linecap","round")),F.setAttribute("d",this.outlinePath(t,i,o,this.computeOverlayRects(t,i,s,n),s,l,ve+h.stroke/2+h.wave,h.wave)),P.append(F),e.append(P),t.container=e,t.clickableElements=[];return}const v=(()=>{switch(m){case C.Underline:{const P=g?wt(p,y):p,F=u.layout==="bounds";return this.underlineDeclarations(t,i,P,f,F).join("; ")}case C.Strikethrough:{const P=g?wt(p,y):p;if(u.layout==="bounds"){const F=u.thickness??1,[x,W]=f==="dashed"?[F*3,F*5]:f==="dotted"?[F,F*2]:[],I=x?`repeating-linear-gradient(45deg, black 0 ${x}px, transparent ${x}px ${W}px)`:null;return[`background: repeating-linear-gradient(-45deg, transparent, transparent 19px, ${P} 19px, ${P} ${19+F}px) !important`,"background-color: transparent !important",I?`-webkit-mask-image: ${I} !important`:null,I?`mask-image: ${I} !important`:null,"box-sizing: border-box !important"].filter(Boolean).join("; ")}return f==="wavy"||Q.drawsOwnDots(f)?[`background-image: ${f==="wavy"?Q.waveImage(P,i.isVertical):Q.dotImage(P,i.isVertical)} !important`,`background-repeat: ${i.isVertical?"no-repeat round":"round no-repeat"} !important`,"background-color: transparent !important","box-sizing: border-box !important"].join("; "):f!=="solid"?[`${i.isVertical?"border-left":"border-top"}: 0 ${f} ${P} !important`,"background-color: transparent !important","box-sizing: border-box !important"].join("; "):[`background-color: ${P} !important`,"box-sizing: border-box !important"].join("; ")}case C.Outline:const E=g?wt(p,y):p;return[`outline: ${h.stroke}px ${f} ${E} !important`,`outline-offset: ${ve}px !important`,"background-color: transparent !important","box-sizing: border-box !important"].join("; ");case C.HighlightUnderline:{const P=g?wt(p,y):p,{r:F,g:x,b:W}=vt(P),I=`rgba(${F}, ${x}, ${W}, 0.3)`,Z=u.layout==="bounds";return this.underlineDeclarations(t,i,P,f,Z,I).join("; ")}case C.Highlight:default:return[`background-color: ${g?wt(p,y):p} !important`,`mix-blend-mode: ${S?"exclusion":"multiply"} !important`,"opacity: 1 !important","box-sizing: border-box !important","transform: translateZ(0) !important"].join("; ")}})(),R=this.wnd.document.createElement("template");R.innerHTML=`<div data-readium="true" class="readium-${m}" style="${v}"></div>`.trim(),c=R.content.firstElementChild}const d=this.computeOverlayRects(t,i,s,n);for(const u of d){const m=c.cloneNode(!0);m.style.setProperty("pointer-events","none"),this.positionElement(t,i,o,m,u,s,l),this.sizeStrikethroughPattern(t,i,o,m,u),e.append(m)}t.container=e,t.clickableElements=Array.from(e.querySelectorAll("[data-activable='1']")),t.clickableElements.length||(t.clickableElements=Array.from(e.children))}renderLayout(t){t.forEach(e=>this.pendingRender.add(e)),this.wnd.cancelAnimationFrame(this.currentRender),this.currentRender=this.wnd.requestAnimationFrame(()=>{t=Array.from(this.pendingRender).filter(e=>this.items.includes(e)&&(!this.experimentalHighlights||!!this.notTextFlag?.has(e.id))),this.pendingRender.clear(),t.length!==0&&this.requireContainer().append(...t.map(e=>e.container).filter(e=>!!e))})}requireShadowHost(){return(!this.shadowHost||!this.shadowRoot)&&(this.shadowHost=this.wnd.document.createElement("div"),this.shadowHost.style.cssText="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none",this.wnd.document.body.appendChild(this.shadowHost),this.shadowRoot=this.shadowHost.attachShadow({mode:"open"})),this.shadowHost}overlayContext(){return Nt(this.wnd,this.requireShadowHost())}requireContainer(t=!1){if(t){let e;return this.wnd.document.getElementById(`${this.id}-style`)?e=this.wnd.document.getElementById(`${this.id}-style`):(e=this.wnd.document.createElement("style"),e.dataset.readium="true",e.id=`${this.id}-style`,this.wnd.document.head.appendChild(e)),e}return this.container||(this.requireShadowHost(),this.container=this.wnd.document.createElement("div"),this.container.setAttribute("id",this.id),this.container.dataset.group=this.name,this.container.dataset.readium="true",this.container.style.setProperty("pointer-events","none"),this.container.style.display="contents",this.shadowRoot.appendChild(this.container)),this.container}getCurrentDarkMode(){return Uo(this.wnd,"--USER__appearance")==="readium-night-on"||Ni(this.getBackgroundColor())}getBackgroundColor(){return Uo(this.wnd,"--USER__backgroundColor")||this.wnd.getComputedStyle(this.wnd.document.documentElement).getPropertyValue("background-color")}scheduleMaskUpdate(){this.maskFrame||(this.maskFrame=this.wnd.requestAnimationFrame(()=>{this.maskFrame=0,this.updateSharedMask()}))}removeShadowHost(){this.shadowHost?.remove(),this.shadowHost=void 0,this.shadowRoot=void 0}opaqueBackgroundColor(){const t=this.getBackgroundColor().trim();return!t||t==="transparent"||/^rgba\(.*,\s*(0|0?\.0+)\s*\)$|\/\s*(0|0?\.0+)\s*\)$/.test(t)?void 0:t}updateSharedMask(){const t=this.items.filter(g=>g.decoration.style?.type===C.Mask);if(t.length===0){this.maskSvg&&(this.maskSvg.remove(),this.maskSvg=void 0),this.container||this.removeShadowHost();return}this.maskSvg&&(this.maskSvg.style.display="none");const e=this.overlayContext(),i=1/this.effectiveZoom(),o=this.wnd.document.documentElement,n=o.scrollWidth*i,s=o.scrollHeight*i,a=this.wnd.document.scrollingElement,h=(((e.isVertical?!e.isVertLR:ko(this.wnd,o))?a.clientWidth-a.scrollWidth:0)-a.scrollLeft+e.xDocOffset)*i,l=(-a.scrollTop+e.yDocOffset)*i,c=[];for(const g of t){const f=g.decoration.style,v=f.layout??"boxes",R=f.width??"wrap",E=this.scaledExpand(f),P=g.range.getBoundingClientRect(),F=v==="bounds"?[E?{left:P.left-E,top:P.top-E,right:P.right+E,bottom:P.bottom+E,width:P.width+E*2,height:P.height+E*2}:P]:Lt(g.range,!1,!1,E);for(const x of F){let W;switch(R){case"viewport":{const I=Math.floor(e.inlineStart(x)/e.viewportInlineSize)*e.viewportInlineSize;W=e.toRect(I,e.blockStart(x),e.viewportInlineSize,e.blockSize(x));break}case"page":{const I=Math.floor(e.inlineStart(x)/e.pageInlineSize)*e.pageInlineSize;W=e.toRect(I,e.blockStart(x),e.pageInlineSize,e.blockSize(x));break}case"bounds":{W=e.toRect(e.inlineStart(P),e.blockStart(x),e.inlineSize(P),e.blockSize(x));break}default:W=e.toRect(e.inlineStart(x),e.blockStart(x),e.inlineSize(x),e.blockSize(x))}c.push(W)}}const d=this.closeInterlines(e,c).map(g=>{const f=(g.left+e.xDocOffset)*i,v=(g.top+e.yDocOffset)*i,R=(g.right+e.xDocOffset)*i,E=(g.bottom+e.yDocOffset)*i;return`M${f} ${v} H${R} V${E} H${f} Z`}).join(" "),u="http://www.w3.org/2000/svg";if(!this.maskSvg){this.requireShadowHost(),this.maskSvg=this.wnd.document.createElementNS(u,"svg"),this.maskSvg.style.cssText=`position:absolute;top:0;left:0;width:${n}px;height:${s}px;pointer-events:none;z-index:${qe-1}`,this.maskSvg.dataset.readium="true";const g=this.wnd.document.createElementNS(u,"defs"),f=this.wnd.document.createElementNS(u,"mask"),v=`${this.id}-mask-holes`;f.setAttribute("id",v),f.setAttribute("maskUnits","userSpaceOnUse");const R=this.wnd.document.createElementNS(u,"rect");R.setAttribute("fill","white");const E=this.wnd.document.createElementNS(u,"path");E.setAttribute("fill","black"),f.append(R,E),g.appendChild(f),this.maskSvg.appendChild(g);const P=this.wnd.document.createElementNS(u,"rect");P.setAttribute("id",`${this.id}-mask-rect`),P.setAttribute("mask",`url(#${v})`),P.style.pointerEvents="none",this.maskSvg.appendChild(P),this.shadowRoot.appendChild(this.maskSvg)}this.maskSvg.style.display="",this.maskSvg.style.left=`${h}px`,this.maskSvg.style.top=`${l}px`,this.maskSvg.style.width=`${n}px`,this.maskSvg.style.height=`${s}px`,this.maskSvg.setAttribute("viewBox",`${h} ${l} ${n} ${s}`);const m=this.maskSvg.querySelector("mask");m?.setAttribute("x",String(h)),m?.setAttribute("y",String(l)),m?.setAttribute("width",String(n)),m?.setAttribute("height",String(s));const p=this.maskSvg.querySelector("mask > rect");p?.setAttribute("x",String(h)),p?.setAttribute("y",String(l)),p?.setAttribute("width",String(n)),p?.setAttribute("height",String(s));const S=this.maskSvg.querySelector("mask > path");S&&S.setAttribute("d",d);const y=this.maskSvg.querySelector(":scope > rect");if(y){const g=t[0].decoration.style.tint,f=g?void 0:this.opaqueBackgroundColor(),v=g??f??ii(C.Mask),R=f?"0.5":"1";y.setAttribute("x",String(h)),y.setAttribute("y",String(l)),y.setAttribute("width",String(n)),y.setAttribute("height",String(s)),y.setAttribute("fill",v),y.setAttribute("fill-opacity",R)}}closeInterlines(t,e){const i=e.map(s=>({i0:t.inlineStart(s),i1:t.inlineStart(s)+t.inlineSize(s),b0:t.blockStart(s),b1:t.blockStart(s)+t.blockSize(s)})).sort((s,a)=>s.b0-a.b0),o=i.map(s=>s.b1),n=i.map(s=>s.b0);return i.forEach((s,a)=>{const h=i.flatMap((d,u)=>d.b0>=s.b1&&d.i0<s.i1&&d.i1>s.i0&&d.b0-s.b1<Math.min(s.b1-s.b0,d.b1-d.b0)?[u]:[]);if(h.length===0)return;const l=i[h[0]],c=(s.b1+l.b0)/2;o[a]=c;for(const d of h)i[d].b0<l.b1&&(n[d]=Math.min(n[d],c))}),i.map((s,a)=>t.toRect(s.i0,n[a],s.i1-s.i0,o[a]-n[a]))}injectCustomStylesheet(t){const e=`${this.id}-custom-style`;let i=this.wnd.document.getElementById(e);i||(i=this.wnd.document.createElement("style"),i.id=e,i.dataset.readium="true",this.wnd.document.head.appendChild(i)),i.innerHTML=t}clearContainer(){if(this.experimentalHighlights){const t=this.wnd.CSS.highlights;for(const e of this._tintSubKeys.values())t.delete(e);this._tintSubKeys.clear(),this._subKeyCounter=0}this.wnd.document.getElementById(`${this.id}-custom-style`)?.remove(),this.container&&(this.container.remove(),this.container=void 0)}};const sn=class Vt extends Mt{constructor(){super(...arguments),this.observedResizeTargets=new Map,this.resizeFrame=0,this.lastGroupId=0,this.groups=new Map,this.handleResizer=this.handleResize.bind(this),this.scrollScheduled=!1,this.handleScroller=this.handleScroll.bind(this)}cleanup(){this.groups.forEach(t=>t.destroy()),this.groups.clear(),this.observedResizeTargets.clear()}updateHighlightStyles(){this.groups.forEach(t=>{t.requestLayout()})}handleResize(){this.wnd.clearTimeout(this.resizeFrame),this.resizeFrame=this.wnd.setTimeout(()=>{this.groups.forEach(t=>t.requestLayout())},50)}handleScroll(){this.scrollScheduled||(this.scrollScheduled=!0,this.wnd.requestAnimationFrame(()=>{this.scrollScheduled=!1,this.groups.forEach(t=>{t.hasOverlayItems&&t.repositionOverlays()})}))}mount(t,e){return this.wnd=t,e.register("decorate",Vt.moduleName,(i,o)=>{const n=i;(n.action==="add"||n.action==="update")&&n.decoration.locator&&(n.decoration.locator=rt.deserialize(n.decoration.locator)),this.groups.has(n.group)||this.groups.set(n.group,new rl(t,e,`readium-decoration-${this.lastGroupId++}`,n.group));const s=this.groups.get(n.group);switch(n.action){case"add":s?.add(n.decoration);break;case"remove":s?.remove(n.decoration.id);break;case"clear":s?.clear();break;case"update":s?.update(n.decoration);break}o(!0)}),e.register("decoration_resize",Vt.moduleName,(i,o)=>{const n=i;n.action==="watch"?this.addDecorationResizeTarget(n.selector):this.removeDecorationResizeTarget(n.selector),o(!0)}),e.register("decoration_activatable",Vt.moduleName,(i,o)=>{const n=i,s=this.groups.get(n.group);s&&(s.activatable=n.activatable),o(!0)}),e.register("decoration_hoverable",Vt.moduleName,(i,o)=>{const n=i,s=this.groups.get(n.group);s&&(s.hoverable=n.hoverable),o(!0)}),this.resizeObserver=new ResizeObserver(()=>t.requestAnimationFrame(()=>this.handleResize())),this.resizeObserver.observe(t.document.documentElement),t.addEventListener("orientationchange",this.handleResizer),t.addEventListener("resize",this.handleResizer),t.addEventListener("scroll",this.handleScroller,{passive:!0,capture:!0}),this.styleObserver=new MutationObserver(i=>{i.some(o=>o.type==="attributes"&&o.attributeName==="style"&&o.oldValue!==o.target.getAttribute("style"))&&this.updateHighlightStyles()}),this.styleObserver.observe(t.document.documentElement,{attributes:!0,attributeFilter:["style"],attributeOldValue:!0}),e.log("Decorator Mounted"),!0}unmount(t,e){return t.removeEventListener("orientationchange",this.handleResizer),t.removeEventListener("resize",this.handleResizer),t.removeEventListener("scroll",this.handleScroller,{capture:!0}),e.unregisterAll(Vt.moduleName),this.resizeObserver.disconnect(),this.styleObserver.disconnect(),this.cleanup(),e.log("Decorator Unmounted"),!0}addDecorationResizeTarget(t){const e=this.observedResizeTargets.get(t);e&&this.resizeObserver.unobserve(e);const i=this.wnd.document.querySelector(t);i?(this.resizeObserver.observe(i),this.observedResizeTargets.set(t,i)):this.observedResizeTargets.delete(t)}removeDecorationResizeTarget(t){const e=this.observedResizeTargets.get(t);e&&(this.resizeObserver.unobserve(e),this.observedResizeTargets.delete(t))}};sn.moduleName="decorator";let sl=sn;const an=class Pt extends Mt{wndOnErr(t){this.comms?.send("error",{message:t.message,filename:t.filename,lineno:t.lineno,colno:t.colno})}mount(t,e){return this.comms=e,t.addEventListener("error",this.wndOnErr,!1),e.register("get_properties",Pt.moduleName,(i,o)=>{Qe(t),o(!0)}),e.register("update_properties",Pt.moduleName,(i,o)=>{Lo(t,i),o(!0)}),e.register("set_property",Pt.moduleName,(i,o)=>{const n=i;Qt(t,n[0],n[1]),o(!0)}),e.register("remove_property",Pt.moduleName,(i,o)=>{ye(t,i),o(!0)}),e.register("activate",Pt.moduleName,(i,o)=>{o(!0)}),e.log("WebPubSetup Mounted"),!0}unmount(t,e){return e.unregisterAll(Pt.moduleName),t.removeEventListener("error",this.wndOnErr),e.log("WebPubSetup Unmounted"),!0}};an.moduleName="webpub_setup";let al=an;const ln=class ki extends Mt{constructor(){super(...arguments),this.styleElement=null,this.beforePrintHandler=null,this.configApplied=!1}setupPrintProtection(t,e){if(!e.disable)return;const i=t.document.createElement("style");i.textContent=`
            @media print {
                body * {
                    display: none !important;
                }
                body::after {
                    content: "${e.watermark||"Printing has been disabled"}";
                    font-size: 200%;
                    display: block;
                    text-align: center;
                    margin-top: 50vh;
                    transform: translateY(-50%);
                }
            }
        `,t.document.head.appendChild(i),this.styleElement=i,this.beforePrintHandler=o=>(o.preventDefault(),!1),t.addEventListener("beforeprint",this.beforePrintHandler)}registerPrintHandlers(){this.comms?.register("print_protection",ki.moduleName,t=>{const e=t;return this.configApplied||(this.configApplied=!0,this.setupPrintProtection(this.wnd,e),this.comms?.log("Print protection configuration applied")),!0})}mount(t,e){return this.wnd=t,this.comms=e,this.registerPrintHandlers(),!0}unmount(t,e){return this.beforePrintHandler&&(t.removeEventListener("beforeprint",this.beforePrintHandler),this.beforePrintHandler=null),this.styleElement?.parentNode&&(this.styleElement.parentNode.removeChild(this.styleElement),this.styleElement=null),this.comms?.unregisterAll(ki.moduleName),this.configApplied=!1,!0}};ln.moduleName="print_protection";let ll=ln;const hn="readium-cjk-vertical-snapper-style",cn=class V extends D{constructor(){super(...arguments),this.patternAnalyzer=null,this.lastScrollTime=0,this.isScrollProtectionEnabled=!1,this.initialScrollHandled=!1,this.isScrolling=!1,this.lastScrollLeft=0,this.isResizing=!1,this.resizeDebounce=null,this.verticalLR=!1,this.handleScroll=t=>{if(this.comms.ready&&!this.isResizing){if(!this.initialScrollHandled){this.lastScrollLeft=Math.abs(this.doc().scrollLeft),this.initialScrollHandled=!0,this.reportProgress();return}this.isScrolling||(this.isScrolling=!0,this.wnd.requestAnimationFrame(()=>{this.reportProgress();const e=Math.abs(this.doc().scrollLeft),i=e-this.lastScrollLeft;if(this.lastScrollLeft=e,this.isScrollProtectionEnabled&&Math.abs(i)>5){const o=Date.now(),n=o-(this.lastScrollTime||o);if(this.patternAnalyzer&&this.patternAnalyzer.analyze(i>0?"down":"up",Math.abs(i),n)){const s=t.target&&"tagName"in t.target?{tagName:t.target.tagName}:null;this.comms?.send("content_protection",{type:"suspicious_scrolling",timestamp:Date.now(),scrollDelta:i,scrollDirection:i>0?"left":"right",targetElement:s})}this.lastScrollTime=o}this.comms.send("scroll",i),this.isScrolling=!1}))}}}doc(){return this.wnd.document.scrollingElement}scrollable(){return Math.max(0,this.doc().scrollWidth-this.wnd.innerWidth)}hasScrolledPast(t){const e=t.getBoundingClientRect(),i=this.wnd.innerWidth/2,o=this.wnd.innerWidth*D.CENTER_TOLERANCE;return this.verticalLR?e.right<=i+o:e.left>=i-o}inCenterBand(t){const e=t.getBoundingClientRect(),i=this.wnd.innerWidth/2,o=this.wnd.innerWidth*D.CENTER_TOLERANCE,n=i-o,s=i+o;return e.width===0?e.left<=s&&e.left>=n:Math.max(0,Math.min(e.right,s)-Math.max(e.left,n))/e.width>=D.CENTER_TOLERANCE}fragmentStart(t){return t.getBoundingClientRect().left+Math.abs(this.doc().scrollLeft)}currentScrollExtent(){return{pos:Math.abs(this.doc().scrollLeft),size:this.wnd.innerWidth}}rectStart(t){const e=Math.abs(this.doc().scrollLeft);return this.verticalLR?t.left+e:e+this.wnd.innerWidth-t.right}reportProgress(t){if(!this.comms.ready)return;const e=this.doc().scrollWidth,i=this.wnd.innerWidth,o=Math.max(1,e-i),n=Math.abs(this.doc().scrollLeft),s=Math.max(0,Math.min(1,n/o)),a=Math.max(0,Math.min(1,(n+i)/e));this.comms.send("progress",{start:s,end:a,fragmentId:t!==void 0?t:this.currentTimelineFragment(),visibleFragmentIds:this.sortedVisibleFragmentIds()}),this.sendTextLayout()}enableScrollProtection(){this.patternAnalyzer||(this.patternAnalyzer=new be(ei),this.isScrollProtectionEnabled=!0,this.comms?.log("Scroll protection enabled"))}mount(t,e){this.wnd=t,this.comms=e,this.initialScrollHandled=!1,this.lastScrollLeft=0,this.isResizing=!1,this.verticalLR=zo(t),this.resizeDebounce&&(this.wnd.clearTimeout(this.resizeDebounce),this.resizeDebounce=null),t.navigator.epubReadingSystem&&(t.navigator.epubReadingSystem.layoutStyle="scrolling");const i=t.document.createElement("style");return i.dataset.readium="true",i.id=hn,i.textContent=`
        * {
            scrollbar-width: none;
        }
        body::-webkit-scrollbar {
            display: none;
        }
        html {
            overflow-x: auto !important;
            overflow-y: hidden !important;
        }
        `,t.document.head.appendChild(i),this.resizeObserver=new ResizeObserver(()=>{this.resizeDebounce&&this.wnd.clearTimeout(this.resizeDebounce),this.isResizing=!0,this.resizeDebounce=this.wnd.setTimeout(()=>{this.isResizing=!1,this.resizeDebounce=null,this.refreshFragmentStarts(),this.reportProgress(),this.sendTextLayout(!0)},50)}),this.resizeObserver.observe(t.document.body),t.addEventListener("scroll",this.handleScroll,{passive:!0}),e.register("force_webkit_recalc",V.moduleName,()=>{Ze(this.wnd);const o=this.doc().scrollLeft;this.verticalLR?this.doc().scrollLeft=o>1?o-1:o+1:this.doc().scrollLeft=o<-1?o+1:o-1,this.doc().scrollLeft=o}),this.registerTextLayout(t,e,V.moduleName),this.registerNavigationLock(t,e,V.moduleName),e.register("go_progression",V.moduleName,(o,n)=>{const s=o;if(s<0||s>1){e.send("error",{message:"go_progression must be given a position from 0.0 to 1.0"}),n(!1);return}this.wnd.requestAnimationFrame(()=>{const a=this.scrollable()*s;this.doc().scrollLeft=this.verticalLR?a:-a,this.reportProgress(this.fragmentFromGeometry()),N(this.wnd),n(!0)})}),e.register("go_id",V.moduleName,(o,n)=>{const s=t.document.getElementById(o);if(!s){n(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollLeft+=s.getBoundingClientRect().left-t.innerWidth/2;const a=o;this.reportProgress(this.timelineEntries.has(a)?a:this.nearestPrecedingTimelineEntry(s)),N(this.wnd),n(!0)})}),e.register("go_text",V.moduleName,(o,n)=>{const s=D.rangeOf(t,o);if(!s){n(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollLeft+=s.getBoundingClientRect().left-t.innerWidth/2,this.reportProgress(this.nearestPrecedingTimelineEntry(s.startContainer)),N(this.wnd),n(!0)})}),e.register("go_start",V.moduleName,(o,n)=>{if(this.doc().scrollLeft===0)return n(!1);this.doc().scrollLeft=0,this.reportProgress(this.firstFragmentIfReached()),n(!0)}),e.register("go_end",V.moduleName,(o,n)=>{if(Math.abs(this.doc().scrollLeft)===this.scrollable())return n(!1);this.doc().scrollLeft=this.verticalLR?this.scrollable():-this.scrollable(),this.reportProgress(this.sortedFragmentIds[this.sortedFragmentIds.length-1]),n(!0)}),e.register(["go_next","go_prev"],V.moduleName,(o,n)=>n(!1)),e.register("unfocus",V.moduleName,(o,n)=>{N(this.wnd),n(!0)}),e.register("scroll_protection",V.moduleName,(o,n)=>{this.enableScrollProtection(),n(!0)}),e.register("focus",V.moduleName,(o,n)=>{this.reportProgress(),n(!0)}),e.register("first_visible_locator",V.moduleName,(o,n)=>{const s=_e(t,!0);this.comms.send("first_visible_locator",s.serialize()),n(!0)}),e.register("timeline_entries",V.moduleName,(o,n)=>{this.updateTimelineEntries(Array.isArray(o)?o:[],t),n(!0)}),e.log("CJKVerticalSnapper Mounted"),!0}unmount(t,e){return e.unregisterAll(V.moduleName),this.unwatchTextLayout(),this.unlockNavigation(t),this.resizeObserver.disconnect(),this.handleScroll&&t.removeEventListener("scroll",this.handleScroll),t.document.getElementById(hn)?.remove(),this.patternAnalyzer&&(this.patternAnalyzer.clear(),this.patternAnalyzer=null,this.isScrollProtectionEnabled=!1),this.timelineEntries.clear(),this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts.clear(),e.log("CJKVerticalSnapper Unmounted"),!0}};cn.moduleName="cjk_vertical_snapper";let hl=cn;const cl=["fixed_setup","decorator","peripherals","print_protection"],dl=["reflowable_setup","decorator","peripherals","column_snapper","scroll_snapper","cjk_vertical_snapper","print_protection"],ni=new Map([Va,Ga,al,Ua,ja,sl,Na,La,hl,ll].map(r=>[r.moduleName,r]));let we=class{constructor(t=window,e=[]){this.loadedModules=[],this.wnd=t,t._readium_cssSelectorGenerator??(t._readium_cssSelectorGenerator={getCssSelector:go}),this.comms=new ua(t);const i=[...new Set(e)];if(i.length){if(typeof t>"u")throw Error("Loader is not in a web browser");t.parent!==t&&this.comms.log("Loader is probably in a frame"),this.loadedModules=i.map(o=>{const n=this.loadModule(o);if(n)return n.mount(this.wnd,this.comms),n}).filter(o=>o!==void 0)}}loadModule(t){const e=ni.get(t);return e===void 0?(this.comms.log(`Module "${name}" does not exist in the library`),e):new e}addModule(t){const e=this.loadModule(t);return!e||!e.mount(this.wnd,this.comms)?!1:(this.loadedModules.push(e),!0)}removeModule(t){const e=ni.get(t);if(e===void 0)return this.comms.log(`Module "${t}" does not exist in the library`),!1;const i=this.loadedModules.findIndex(o=>o instanceof e);return i<0?!1:(this.loadedModules[i].unmount(this.wnd,this.comms),this.loadedModules.splice(i,1),!0)}destroy(){this.comms.destroy(),this.loadedModules.forEach(t=>t.unmount(this.wnd,this.comms)),this.loadedModules=[]}};const ul={type:"developer_tools",keyCombos:[{keyCode:73,meta:!0,alt:!0},{keyCode:73,ctrl:!0,shift:!0},{keyCode:74,meta:!0,alt:!0},{keyCode:74,ctrl:!0,shift:!0},{keyCode:85,meta:!0,alt:!0},{keyCode:67,meta:!0,alt:!0},{keyCode:67,meta:!0,shift:!0},{keyCode:67,ctrl:!0,shift:!0},{keyCode:65,meta:!0,alt:!0},{keyCode:84,meta:!0,shift:!0,alt:!0},{keyCode:67,shift:!0,alt:!0},{keyCode:123},{keyCode:123,shift:!0},{keyCode:123,ctrl:!0,shift:!0},{keyCode:123,meta:!0,alt:!0}]},ml={type:"select_all",keyCombos:[{keyCode:65,meta:!0},{keyCode:65,ctrl:!0}]},pl={type:"print",keyCombos:[{keyCode:80,meta:!0},{keyCode:80,ctrl:!0},{keyCode:80,meta:!0,shift:!0},{keyCode:80,ctrl:!0,shift:!0},{keyCode:80,meta:!0,alt:!0},{keyCode:80,ctrl:!0,alt:!0}]},gl={type:"save",keyCombos:[{keyCode:83,meta:!0},{keyCode:83,ctrl:!0}]};let fl=class{mergeKeyboardPeripherals(t,e=[]){const i=[],o=e.filter(s=>!["developer_tools","select_all","print","save"].includes(s.type));t.disableSelectAll&&i.push(ml),t.disableSave&&i.push(gl),t.monitorDevTools&&i.push(ul),t.protectPrinting?.disable&&i.push(pl);const n=[...i];for(const s of o){const a=s.keyCombos.filter(h=>!i.some(l=>l.keyCombos.some(c=>h.keyCode===c.keyCode&&h.ctrl===c.ctrl&&h.shift===c.shift&&h.alt===c.alt&&h.meta===c.meta&&(n.includes(l)||h.condition===c.condition))));a.length>0&&i.push({...s,keyCombos:a})}return i}},Sl=class lr extends fl{constructor(){super(...arguments),this.viewportWatchers=new Set}watchViewport(t){return this.viewportWatchers.add(t),()=>{this.viewportWatchers.delete(t)}}notifyViewportChange(t){const e=this.viewport,i={readingOrder:[...e.readingOrder],progressions:new Map([...e.progressions].map(([o,n])=>[o,{...n}])),positions:e.positions?[...e.positions]:null};this.notifiedViewport&&lr.sameViewport(this.notifiedViewport,i)||(this.notifiedViewport=i,t(i),this.viewportWatchers.forEach(o=>o(i)))}static sameViewport(t,e){const i=(o,n)=>o===n||!!o&&!!n&&o.length===n.length&&o.every((s,a)=>s===n[a]);return i(t.readingOrder,e.readingOrder)&&i(t.positions,e.positions)&&t.readingOrder.every(o=>t.progressions.get(o)?.start===e.progressions.get(o)?.start&&t.progressions.get(o)?.end===e.progressions.get(o)?.end)}goLeft(t=!1,e){this.readingProgression===M.ltr?this.goBackward(t,e):this.readingProgression===M.rtl&&this.goForward(t,e)}goRight(t=!1,e){this.readingProgression===M.ltr?this.goForward(t,e):this.readingProgression===M.rtl&&this.goBackward(t,e)}};const yl=new Set(Object.values(C));function _l(r,t){return r===C.TextColor?typeof window<"u"&&"Highlight"in window:yl.has(r)?!0:!!t?.[r]}function ri(r,t){const{style:e}=r;if(e.type===C.Template){const i=e;return{...r,style:{...i,element:dn(i,r)}}}if(e.type&&t?.[e.type]){const i=t[e.type];return{...r,style:{type:C.Template,layout:i.layout,width:i.width,stylesheet:i.stylesheet,element:dn(i,r)}}}return r}function dn(r,t){return typeof r.element=="function"?r.element(t):r.element}function bl(r,t){if(r.type!==t.type)return!1;if(r.type===C.Template){const o=r,n=t;return o.layout===n.layout&&o.width===n.width&&o.stylesheet===n.stylesheet}const e=r,i=t;return e.tint===i.tint&&e.layout===i.layout&&e.width===i.width&&(e.enforceContrast??!0)===(i.enforceContrast??!0)&&(e.expand??0)===(i.expand??0)&&e.thickness===i.thickness&&e.lineStyle===i.lineStyle}function vl(r,t){return r.locator.href===t.locator.href&&JSON.stringify(r.locator.locations?.serialize?.()??r.locator.locations)===JSON.stringify(t.locator.locations?.serialize?.()??t.locator.locations)&&JSON.stringify(r.locator.text??null)===JSON.stringify(t.locator.text??null)&&bl(r.style,t.style)&&JSON.stringify(r.extras??null)===JSON.stringify(t.extras??null)}const wl=1e4,Rl=5e3;let si=class{constructor(t,e){this.registry=new Map,this._ready=!1,this.listenerBuffer=[],this.visibleTime=0,this.visibleSince=document.hidden?void 0:performance.now(),this.visibilityHandler=this.handleVisibility.bind(this),this.handler=this.handle.bind(this),this.wnd=t,this.origin=e;try{this.channelId=window.crypto.randomUUID()}catch{this.channelId=Be()}this.startGc(),window.addEventListener("message",this.handler),this.send("_ping",void 0)}set listener(t){this.listenerBuffer.length>0&&this.listenerBuffer.forEach(e=>t(e[0],e[1])),this.listenerBuffer=[],this._listener=t}clearListener(){typeof this._listener=="function"&&(this._listener=void 0)}startGc(){this.gc===void 0&&(this.handleVisibility(),document.addEventListener("visibilitychange",this.visibilityHandler),this.gc=setInterval(()=>{const t=this.visibleNow();this.registry.forEach((e,i)=>{t-e.time>wl&&(console.warn(i,"event for",e.key,"was never handled!"),this.registry.delete(i))})},Rl))}stopGc(){this.visibleTime=this.visibleNow(),this.visibleSince=void 0,document.removeEventListener("visibilitychange",this.visibilityHandler),clearInterval(this.gc),this.gc=void 0}visibleNow(){return this.visibleTime+(this.visibleSince===void 0?0:performance.now()-this.visibleSince)}handleVisibility(){document.hidden?(this.visibleTime=this.visibleNow(),this.visibleSince=void 0):this.visibleSince===void 0&&(this.visibleSince=performance.now())}halt(){this._ready=!1,window.removeEventListener("message",this.handler),this.stopGc(),this._listener=void 0,this.registry.clear()}resume(){window.addEventListener("message",this.handler),this.startGc(),this._ready=!0}handle(t){const e=t.data;if(!e._readium){console.warn("Ignoring",e);return}if(e._channel===this.channelId)switch(e.key){case"_ack":{if(!e.id)return;const i=this.registry.get(e.id);if(!i)return;this.registry.delete(e.id),i.cb(!!e.data);return}case"_pong":this._ready=!0;default:{if(!this.ready)return;typeof this._listener=="function"?this._listener(e.key,e.data):this.listenerBuffer.push([e.key,e.data])}}}get ready(){return this._ready}send(t,e,i,o=!1,n=[]){const s=Be();return i&&this.registry.set(s,{cb:i,time:this.visibleNow(),key:t}),this.wnd.postMessage({_readium:Ot,_channel:this.channelId,id:s,data:e,key:t,strict:o},"/",n),s}},ai=class{constructor(t,e){this.config=t,this.onUpdate=e,this.unsubs=[],this.conditionValues=new Map}setup(){let t=!0;const e=new Map;this.config.forEach(i=>i.keyCombos.forEach(o=>{if(o.condition){const n=e.get(o.condition)??[];n.push(o),e.set(o.condition,n)}})),e.forEach((i,o)=>{const n=o.subscribe(s=>{i.forEach(a=>this.conditionValues.set(a,s)),t||this.onUpdate(this.buildSerializable())});this.unsubs.push(n)}),t=!1,this.onUpdate(this.buildSerializable())}buildSerializable(){return this.config.map(t=>({...t,keyCombos:t.keyCombos.filter(e=>!e.condition||this.conditionValues.get(e)===!0).map(({condition:e,...i})=>i)})).filter(t=>t.keyCombos.length>0)}destroy(){this.unsubs.forEach(t=>t()),this.unsubs=[],this.conditionValues.clear()}};function un(){let r=Promise.resolve();return t=>{const e=r.then(t);return r=e.catch(()=>{}),e}}var li,mn;function Cl(){if(mn)return li;mn=1;function r(o){if(typeof o!="string")throw new TypeError("Path must be a string. Received "+JSON.stringify(o))}function t(o,n){for(var s="",a=0,h=-1,l=0,c,d=0;d<=o.length;++d){if(d<o.length)c=o.charCodeAt(d);else{if(c===47)break;c=47}if(c===47){if(!(h===d-1||l===1))if(h!==d-1&&l===2){if(s.length<2||a!==2||s.charCodeAt(s.length-1)!==46||s.charCodeAt(s.length-2)!==46){if(s.length>2){var u=s.lastIndexOf("/");if(u!==s.length-1){u===-1?(s="",a=0):(s=s.slice(0,u),a=s.length-1-s.lastIndexOf("/")),h=d,l=0;continue}}else if(s.length===2||s.length===1){s="",a=0,h=d,l=0;continue}}n&&(s.length>0?s+="/..":s="..",a=2)}else s.length>0?s+="/"+o.slice(h+1,d):s=o.slice(h+1,d),a=d-h-1;h=d,l=0}else c===46&&l!==-1?++l:l=-1}return s}function e(o,n){var s=n.dir||n.root,a=n.base||(n.name||"")+(n.ext||"");return s?s===n.root?s+a:s+o+a:a}var i={resolve:function(){for(var o="",n=!1,s,a=arguments.length-1;a>=-1&&!n;a--){var h;a>=0?h=arguments[a]:(s===void 0&&(s=process.cwd()),h=s),r(h),h.length!==0&&(o=h+"/"+o,n=h.charCodeAt(0)===47)}return o=t(o,!n),n?o.length>0?"/"+o:"/":o.length>0?o:"."},normalize:function(o){if(r(o),o.length===0)return".";var n=o.charCodeAt(0)===47,s=o.charCodeAt(o.length-1)===47;return o=t(o,!n),o.length===0&&!n&&(o="."),o.length>0&&s&&(o+="/"),n?"/"+o:o},isAbsolute:function(o){return r(o),o.length>0&&o.charCodeAt(0)===47},join:function(){if(arguments.length===0)return".";for(var o,n=0;n<arguments.length;++n){var s=arguments[n];r(s),s.length>0&&(o===void 0?o=s:o+="/"+s)}return o===void 0?".":i.normalize(o)},relative:function(o,n){if(r(o),r(n),o===n||(o=i.resolve(o),n=i.resolve(n),o===n))return"";for(var s=1;s<o.length&&o.charCodeAt(s)===47;++s);for(var a=o.length,h=a-s,l=1;l<n.length&&n.charCodeAt(l)===47;++l);for(var c=n.length,d=c-l,u=h<d?h:d,m=-1,p=0;p<=u;++p){if(p===u){if(d>u){if(n.charCodeAt(l+p)===47)return n.slice(l+p+1);if(p===0)return n.slice(l+p)}else h>u&&(o.charCodeAt(s+p)===47?m=p:p===0&&(m=0));break}var S=o.charCodeAt(s+p),y=n.charCodeAt(l+p);if(S!==y)break;S===47&&(m=p)}var g="";for(p=s+m+1;p<=a;++p)(p===a||o.charCodeAt(p)===47)&&(g.length===0?g+="..":g+="/..");return g.length>0?g+n.slice(l+m):(l+=m,n.charCodeAt(l)===47&&++l,n.slice(l))},_makeLong:function(o){return o},dirname:function(o){if(r(o),o.length===0)return".";for(var n=o.charCodeAt(0),s=n===47,a=-1,h=!0,l=o.length-1;l>=1;--l)if(n=o.charCodeAt(l),n===47){if(!h){a=l;break}}else h=!1;return a===-1?s?"/":".":s&&a===1?"//":o.slice(0,a)},basename:function(o,n){if(n!==void 0&&typeof n!="string")throw new TypeError('"ext" argument must be a string');r(o);var s=0,a=-1,h=!0,l;if(n!==void 0&&n.length>0&&n.length<=o.length){if(n.length===o.length&&n===o)return"";var c=n.length-1,d=-1;for(l=o.length-1;l>=0;--l){var u=o.charCodeAt(l);if(u===47){if(!h){s=l+1;break}}else d===-1&&(h=!1,d=l+1),c>=0&&(u===n.charCodeAt(c)?--c===-1&&(a=l):(c=-1,a=d))}return s===a?a=d:a===-1&&(a=o.length),o.slice(s,a)}else{for(l=o.length-1;l>=0;--l)if(o.charCodeAt(l)===47){if(!h){s=l+1;break}}else a===-1&&(h=!1,a=l+1);return a===-1?"":o.slice(s,a)}},extname:function(o){r(o);for(var n=-1,s=0,a=-1,h=!0,l=0,c=o.length-1;c>=0;--c){var d=o.charCodeAt(c);if(d===47){if(!h){s=c+1;break}continue}a===-1&&(h=!1,a=c+1),d===46?n===-1?n=c:l!==1&&(l=1):n!==-1&&(l=-1)}return n===-1||a===-1||l===0||l===1&&n===a-1&&n===s+1?"":o.slice(n,a)},format:function(o){if(o===null||typeof o!="object")throw new TypeError('The "pathObject" argument must be of type Object. Received type '+typeof o);return e("/",o)},parse:function(o){r(o);var n={root:"",dir:"",base:"",ext:"",name:""};if(o.length===0)return n;var s=o.charCodeAt(0),a=s===47,h;a?(n.root="/",h=1):h=0;for(var l=-1,c=0,d=-1,u=!0,m=o.length-1,p=0;m>=h;--m){if(s=o.charCodeAt(m),s===47){if(!u){c=m+1;break}continue}d===-1&&(u=!1,d=m+1),s===46?l===-1?l=m:p!==1&&(p=1):l!==-1&&(p=-1)}return l===-1||d===-1||p===0||p===1&&l===d-1&&l===c+1?d!==-1&&(c===0&&a?n.base=n.name=o.slice(1,d):n.base=n.name=o.slice(c,d)):(c===0&&a?(n.name=o.slice(1,l),n.base=o.slice(1,d)):(n.name=o.slice(c,l),n.base=o.slice(c,d)),n.ext=o.slice(l,d)),c>0?n.dir=o.slice(0,c-1):a&&(n.dir="/"),n},sep:"/",delimiter:":",win32:null,posix:null};return i.posix=i,li=i,li}var pn=Cl();function te(r){const t=r.languages?.[0]?.toLowerCase(),e=r.readingProgression;if(t){if(t.startsWith("zh")||t.startsWith("ja")||t.startsWith("ko"))return e===M.rtl?"cjk-vertical":"cjk-horizontal";if(t.startsWith("mn-mong"))return"mongolian-vertical";if(t.startsWith("ar")||t.startsWith("fa")||t.startsWith("he"))return"rtl"}return"ltr"}const gn={experimentalHeaderFiltering:{description:"Attempts to filter out paragraphs that are implicitly headings or part of headers",scope:"RS",value:"readium-experimentalHeaderFiltering-on"},experimentalZoom:{description:"Attempts to filter out elements that are sized using viewport units and should not be scaled directly e.g. tables, images, iframes, etc.",scope:"RS",value:"readium-experimentalZoom-on"}};var ee=(r=>(r.start="start",r.left="left",r.right="right",r.justify="justify",r))(ee||{});const Ut={range:[0,100],step:1},Re={range:[.7,4],step:.05},Ce={range:[100,1e3],step:100},Ee={range:[50,250],step:10},fn={range:[0,1],step:.125},Sn={range:[1,2.5],step:.1},At={range:[20,100],step:1},yn={range:[0,3],step:.25},_n={range:[0,3],step:.25},bn={range:[0,2],step:.125};let vn=class{constructor(){}toFlag(t){return`readium-${t}-on`}toUnitless(t){return t.toString()}toPercentage(t,e=!1){return e||t>0&&t<=1?`${Math.round(t*100)}%`:`${t}%`}toVw(t){const e=Math.round(t*100);return`${Math.min(e,100)}vw`}toVh(t){const e=Math.round(t*100);return`${Math.min(e,100)}vh`}toPx(t){return`${t}px`}toRem(t){return`${t}rem`}};function El(r,t){return r==null||t==null||r<=t?r:void 0}function Pl(r,t){return r==null||t==null||r>=t?r:void 0}function Y(r){return typeof r=="string"?r:r===null?null:void 0}function H(r){return typeof r=="boolean"||r==null?r:void 0}function wn(r,t){if(r!==void 0)return r===null?null:t[r]!==void 0?r:void 0}function Ht(r){return typeof r=="boolean"||typeof r=="number"&&r>=0?r:r===null?null:void 0}function k(r){if(r!==void 0)return r===null?null:r<0?void 0:r}function It(r,t){if(r===void 0)return;if(r===null)return null;const e=Math.min(...t),i=Math.max(...t);return r>=e&&r<=i?r:void 0}function hi(r,t){return r===void 0?t:r}function Fl(r){if(r!==void 0)return r===null?null:r.filter(t=>t in gn)}let $=class{constructor({initialValue:t=null,effectiveValue:e,isEffective:i,onChange:o}){this._value=t,this._effectiveValue=e,this._isEffective=i,this._onChange=o}set value(t){this._value=t,this._onChange(this._value)}get value(){return this._value}get effectiveValue(){return this._effectiveValue}get isEffective(){return this._isEffective}clear(){this._value=null}},st=class extends ${set value(t){this._value=t,this._onChange(this._value)}get value(){return this._value}get effectiveValue(){return this._effectiveValue}get isEffective(){return this._isEffective}clear(){this._value=null}toggle(){this._value=!this._value,this._onChange(this._value)}},xl=class extends ${constructor({initialValue:t=null,effectiveValue:e,isEffective:i,onChange:o,supportedValues:n}){super({initialValue:t,effectiveValue:e,isEffective:i,onChange:o}),this._supportedValues=n}set value(t){if(t&&!this._supportedValues.includes(t))throw new Error(`Value '${String(t)}' is not in the supported values for this preference.`);this._value=t,this._onChange(this._value)}get value(){return this._value}get effectiveValue(){return this._effectiveValue}get isEffective(){return this._isEffective}get supportedValues(){return this._supportedValues}clear(){this._value=null}};class q extends ${constructor({initialValue:t=null,effectiveValue:e,isEffective:i,onChange:o,supportedRange:n,step:s}){super({initialValue:t,effectiveValue:e,isEffective:i,onChange:o}),this._supportedRange=n,this._step=s,this._decimals=this._step.toString().includes(".")?this._step.toString().split(".")[1].length:0}set value(t){if(t&&(t<this._supportedRange[0]||t>this._supportedRange[1]))throw new Error(`Value '${String(t)}' is out of the supported range for this preference.`);this._value=t,this._onChange(this._value)}get value(){return this._value}get effectiveValue(){return this._effectiveValue}get isEffective(){return this._isEffective}get supportedRange(){return this._supportedRange}get step(){return this._step}increment(){this._value&&this._value<this._supportedRange[1]&&(this._value=Math.min(Math.round((this._value+this._step)*10**this._decimals)/10**this._decimals,this._supportedRange[1]),this._onChange(this._value))}decrement(){this._value&&this._value>this._supportedRange[0]&&(this._value=Math.max(Math.round((this._value-this._step)*10**this._decimals)/10**this._decimals,this._supportedRange[0]),this._onChange(this._value))}format(t){return t.toString()}clear(){this._value=null}}const Rn=r=>{if("blob"in r&&r.blob.type)return r.blob.type;if(r.as==="script")return"text/javascript";if(r.as==="link"&&"url"in r){const t=r.url.toLowerCase();if(t.endsWith(".css"))return"text/css";if([".js",".mjs",".cjs"].some(e=>t.endsWith(e)))return"text/javascript"}},Cn=(r,t)=>{t.attributes&&Object.entries(t.attributes).forEach(([e,i])=>{e==="type"||e==="rel"||e==="href"||e==="src"||i!=null&&(typeof i=="boolean"?i&&r.setAttribute(e,""):r.setAttribute(e,i))})},kl=(r,t,e)=>{const i=r.createElement("script");i.dataset.readium="true",t.id&&(i.id=t.id);const o=t.type||Rn(t);return o&&(i.type=o),Cn(i,t),i.src=e,i},En=(r,t,e)=>{const i=r.createElement("link");i.dataset.readium="true",t.id&&(i.id=t.id),t.rel&&(i.rel=t.rel);const o=t.type||Rn(t);return o&&(i.type=o),Cn(i,t),i.href=e,i};let zl=class{constructor(t){this.blobStore=new Map,this.createdBlobUrls=new Set,this.allowedDomains=[],this.injectableIdCounter=0,this.allowedDomains=(t.allowedDomains||[]).map(e=>{try{return new URL(e),e}catch{throw new Error(`Invalid allowed domain: "${e}". Must be a valid URL (e.g., "https://fonts.googleapis.com").`)}}),this.rules=t.rules.map(e=>{const i={...e};return e.prepend&&(i.prepend=e.prepend.map(o=>({...o,id:o.id||`injectable-${this.injectableIdCounter++}`})).reverse()),e.append&&(i.append=e.append.map(o=>({...o,id:o.id||`injectable-${this.injectableIdCounter++}`}))),i})}dispose(){for(const t of this.createdBlobUrls)try{URL.revokeObjectURL(t)}catch(e){console.warn("Failed to revoke blob URL:",t,e)}this.createdBlobUrls.clear()}getAllowedDomains(){return[...this.allowedDomains]}async injectForDocument(t,e){for(const i of this.rules)this.matchesRule(i,e)&&await this.applyRule(t,i)}matchesRule(t,e){const i=e.href;return t.resources.some(o=>o instanceof RegExp?o.test(i):i===o)}async getOrCreateBlobUrl(t){const e=t.id;if(this.blobStore.has(e)){const i=this.blobStore.get(e);return i.refCount++,i.url}if("blob"in t){const i=URL.createObjectURL(t.blob);return this.blobStore.set(e,{url:i,refCount:1}),this.createdBlobUrls.add(i),i}throw new Error("Resource must have a blob property")}async releaseBlobUrl(t){if(!this.createdBlobUrls.has(t))return;const e=Array.from(this.blobStore.values()).find(i=>i.url===t);if(e&&(e.refCount--,e.refCount<=0)){URL.revokeObjectURL(t),this.createdBlobUrls.delete(t);for(const[i,o]of this.blobStore.entries())if(o.url===t){this.blobStore.delete(i);break}}}async getResourceUrl(t,e){if("url"in t){const i=new URL(t.url,e.baseURI).toString();if(!this.isValidUrl(i,e))throw new Error(`Invalid URL: Only HTTPS, data:, blob:, or localhost HTTP URLs are allowed. Got: ${t.url}`);return i}else return this.getOrCreateBlobUrl(t)}createPreloadLink(t,e,i){if(e.as!=="link"||e.rel!=="preload")return;const o={...e,rel:"preload",attributes:{...e.attributes,as:e.as}},n=En(t,o,i);t.head.appendChild(n)}createElement(t,e,i){if(e.as==="script")return kl(t,e,i);if(e.as==="link")return En(t,e,i);throw new Error(`Unsupported element type: ${e.as}`)}async applyRule(t,e){const i=[],o=e.prepend?e.prepend.filter(s=>!s.condition||s.condition(t)):[],n=e.append?e.append.filter(s=>!s.condition||s.condition(t)):[];try{for(const s of o)await this.processInjectable(s,t,i,"prepend");for(const s of n)await this.processInjectable(s,t,i,"append")}catch(s){for(const{element:a,url:h}of i)try{a.remove(),await this.releaseBlobUrl(h)}catch(l){console.error("Error during cleanup:",l)}throw s}}async processInjectable(t,e,i,o){const n=t.target==="body"?e.body:e.head;if(!n)return;let s=null;try{if(s=await this.getResourceUrl(t,e),t.rel==="preload"&&"url"in t)this.createPreloadLink(e,t,s);else{const a=this.createElement(e,t,s);i.push({element:a,url:s}),o==="prepend"?n.prepend(a):n.append(a)}}catch(a){throw console.error("Failed to process resource:",a),s&&"blob"in t&&await this.releaseBlobUrl(s),a}}isValidUrl(t,e){try{const i=new URL(t,e.baseURI);if(i.protocol==="data:"||i.protocol==="blob:"&&this.createdBlobUrls.has(t))return!0;if(this.allowedDomains.length>0){const o=i.origin;return this.allowedDomains.some(n=>{const s=new URL(n).origin;return o===s})}return!1}catch{return!1}}};const ci=r=>r.replace(/\/\/.*/g,"").replace(/\/\*[\s\S]*?\*\//g,"").replace(/\n/g,"").replace(/\s+/g," "),Pe=r=>r.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\r\n\t]+/g,"").replace(/ {2,}/g," "),Tl='!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports._readium_cssSelectorGenerator=t():e._readium_cssSelectorGenerator=t()}(self,()=>(()=>{"use strict";const e={d:(t,n)=>{if(Array.isArray(n))for(var o=0;o<n.length;){var r=n[o++],i=n[o++];e.o(t,r)?0===i&&o++:0===i?Object.defineProperty(t,r,{enumerable:!0,value:n[o++]}):Object.defineProperty(t,r,{enumerable:!0,get:i})}else for(var r in n)e.o(n,r)&&!e.o(t,r)&&Object.defineProperty(t,r,{enumerable:!0,get:n[r]})},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r:e=>{Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})}};let t={};function n(e){return"object"==typeof e&&null!==e&&e.nodeType===Node.ELEMENT_NODE}e.r(t),e.d(t,{_readium_cssSelectorGenerator:()=>re,default:()=>ie,getCssSelector:()=>oe});const o={NONE:"",DESCENDANT:" ",CHILD:" > "},r={id:"id",class:"class",tag:"tag",attribute:"attribute",nthchild:"nthchild",nthoftype:"nthoftype"},i="_readium_cssSelectorGenerator";function s(e="unknown problem",...t){console.warn(`${i}: ${e}`,...t)}const c={selectors:[r.id,r.class,r.tag,r.attribute],includeTag:!1,whitelist:[],blacklist:[],combineWithinSelector:!0,combineBetweenSelectors:!0,root:null,maxCombinations:Number.POSITIVE_INFINITY,maxCandidates:Number.POSITIVE_INFINITY,useScope:!1,ignoreGeneratedClassNames:!1};function l(e){return!!e}function u(e){return e instanceof RegExp}function a(e){return["string","function"].includes(typeof e)||u(e)}function f(e){return Array.isArray(e)?e.filter(a):[]}function d(e){const t=[Node.DOCUMENT_NODE,Node.DOCUMENT_FRAGMENT_NODE,Node.ELEMENT_NODE];return function(e){return null!=e&&"object"==typeof e&&"nodeType"in e&&"number"==typeof e.nodeType}(e)&&t.includes(e.nodeType)}function p(e,t){if(d(e))return e.contains(t)||s("element root mismatch","Provided root does not contain the element. This will most likely result in producing a fallback selector using element\'s real root node. If you plan to use the selector using provided root (e.g. `root.querySelector`), it will not work as intended."),e;const n=t.getRootNode({composed:!1});return d(n)?(n.nodeType!==Node.DOCUMENT_NODE&&s("shadow root inferred","You did not provide a root and the element is a child of Shadow DOM. This will produce a selector using ShadowRoot as a root. If you plan to use the selector using document as a root (e.g. `document.querySelector`), it will not work as intended."),n):S(t)}function m(e){return"number"==typeof e?e:Number.POSITIVE_INFINITY}function g(e=[]){const[t=[],...n]=e;return 0===n.length?t:n.reduce((e,t)=>{const n=new Set(t);return e.filter(e=>n.has(e))},t)}function h(e){const t=e.map(e=>{if(u(e))return t=>e.test(t);if("function"==typeof e)return t=>{const n=e(t);return"boolean"!=typeof n?(s("pattern matcher function invalid","Provided pattern matching function does not return boolean. It\'s result will be ignored.",e),!1):n};if("string"==typeof e){const t=new RegExp("^"+e.replace(/[|\\\\{}()[\\]^$+?.]/g,"\\\\$&").replace(/\\*/g,".+")+"$");return e=>t.test(e)}return s("pattern matcher invalid","Pattern matching only accepts strings, regular expressions and/or functions. This item is invalid and will be ignored.",e),()=>!1});return e=>t.some(t=>t(e))}function y(e,t,n){const o=p(n,e[0]).querySelectorAll(t);if(o.length!==e.length)return!1;const r=new Set(o);return e.every(e=>r.has(e))}function b(e,t){t=null!=t?t:S(e);const o=[];let r=e;for(;r&&r!==t;)n(r)&&o.push(r),r=r.parentNode;return o}function N(e,t){return g(e.map(e=>b(e,t)))}function S(e){return e.ownerDocument.querySelector(":root")}const v=new RegExp(["^$","\\\\s"].join("|")),O=new RegExp(["^$"].join("|")),w=[r.nthoftype,r.tag,r.id,r.class,r.attribute,r.nthchild],E=h(["class","id","ng-*"]);function x({name:e}){return`[${e}]`}function T({name:e,value:t}){return`[${e}=\'${t}\']`}function j({nodeName:e,nodeValue:t}){return{name:B(e),value:B(null!=t?t:void 0)}}function C(e,t){const n=Array.from(e.attributes).filter(t=>function({nodeName:e,nodeValue:t},n){const o=n.tagName.toLowerCase();return!(["input","option"].includes(o)&&"value"===e||"src"===e&&(null==t?void 0:t.startsWith("data:"))||E(e))}(t,e)).map(j);return[...n.map(x),...n.map(T)]}const I=/^[a-z_-]{3,}$/i,A=/[bcdfghjklmnpqrstvwxyz]{4,}/i;function R(e,t){var n;const o=(null!==(n=e.getAttribute("class"))&&void 0!==n?n:"").trim().split(/\\s+/).filter(e=>!O.test(e));let r=o;if(null==t?void 0:t.ignoreGeneratedClassNames){const e=h(t.whitelist);r=o.filter(t=>{const n=`.${B(t)}`;return!!e(n)||function(e){if(!I.test(e))return!1;if(e.includes("_")&&!e.includes("__"))return!1;if(/^(css|sc|jsx|emotion|makeStyles|MuiButton|MuiBox)-/i.test(e))return!1;const t=e.split(/--|__|[-]|(?<=[a-z])(?=[A-Z])/).filter(e=>e.length>0);if(0===t.length)return!1;if(1===t.length&&t[0].length<4)return!1;for(const e of t){if(e.length<=2)return!1;if(A.test(e))return!1}return!0}(t)})}return r.map(e=>`.${B(e)}`)}function _(e,t){var n;const o=null!==(n=e.getAttribute("id"))&&void 0!==n?n:"",r=`#${B(o)}`,i=e.getRootNode({composed:!1});return!v.test(o)&&y([e],r,i)?[r]:[]}function $(e,t){const n=e.parentNode,o=n&&"children"in n?n.children:null;if(o)for(let t=0;t<o.length;t++)if(o[t]===e)return[`:nth-child(${String(t+1)})`];return[]}function D(e,t){return[B(e.tagName.toLowerCase())]}function P(e,t){const n=[...new Set((o=e.map(e=>D(e)),[].concat(...o)))];var o;return 0===n.length||n.length>1?[]:[n[0]]}function M(e,t){const n=P([e])[0],o=e.parentNode,r=o&&"children"in o?o:null;if(r){const t=Array.from(r.children).filter(e=>e.tagName.toLowerCase()===n),o=t.indexOf(e);if(o>-1)return[`${n}:nth-of-type(${String(o+1)})`]}return[]}function*k(e=[],{maxResults:t=Number.POSITIVE_INFINITY}={}){let n=0,o=L(1);for(;o.length<=e.length&&n<t;){n+=1;const t=new Array(o.length);for(let n=0;n<o.length;n++)t[n]=e[o[n]];yield t,o=G(o,e.length-1)}}function G(e=[],t=0){const n=e.length;if(0===n)return e;let o=n-1;for(;o>=0&&e[o]===t-(n-1-o);)o-=1;if(o<0)return L(n+1);e[o]+=1;for(let t=o+1;t<n;t++)e[t]=e[t-1]+1;return e}function L(e=1){const t=new Array(e);for(let n=0;n<e;n++)t[n]=n;return t}const F=":".charCodeAt(0).toString(16).toUpperCase(),V=/[ !"#$%&\'()[\\]{|}<>*+,./;=?@^`~\\\\]/;function B(e=""){return CSS?CSS.escape(e):function(e=""){return e.split("").map(e=>":"===e?`\\\\${F} `:V.test(e)?`\\\\${e}`:escape(e).replace(/%/g,"\\\\")).join("")}(e)}const Y={tag:P,id:function(e,t){return 0===e.length||e.length>1?[]:_(e[0])},class:function(e,t){return g(e.map(e=>R(e,t)))},attribute:function(e,t){return g(e.map(e=>C(e)))},nthchild:function(e,t){return g(e.map(e=>$(e)))},nthoftype:function(e,t){return g(e.map(e=>M(e)))}},q={tag:D,id:_,class:R,attribute:C,nthchild:$,nthoftype:M};function U(){const e=new Map;let t;return(n,o)=>{if(1!==n.length)return null!=t?t:t=W(n,o);const[r]=n;let i=e.get(r);return i||(i=W(n,o),e.set(r,i)),i}}function W(e,t){const{blacklist:n,whitelist:o,combineWithinSelector:r,maxCombinations:i}=t,s=h(n),c=h(o);return function(e){const{selectors:t,includeTag:n}=e,o=[...t];return n&&!o.includes("tag")&&o.push("tag"),o}(t).reduce((n,o)=>{const l=function(e,t,n){return(0,Y[t])(e,n)}(e,o,t),u=function(e=[],t,n){return e.filter(e=>n(e)||!t(e))}(l,s,c),a=function(e=[],t){return e.sort((e,n)=>{const o=t(e),r=t(n);return o&&!r?-1:!o&&r?1:0})}(u,c);return n[o]=r?Array.from(k(a,{maxResults:i})):a.map(e=>[e]),n},{})}function H(e){return e.includes(r.tag)||e.includes(r.nthoftype)?[...e]:[...e,r.tag]}function*z(e,t){const n={};for(const o of e){const e=t[o];e&&e.length>0&&(n[o]=e)}for(const e of function*(e={}){const t=Object.entries(e);if(0===t.length)return;const n=[{index:t.length-1,partial:{}}];for(;n.length>0;){const e=n.pop();if(!e)break;const{index:o,partial:r}=e;if(o<0){yield r;continue}const[i,s]=t[o];for(let e=s.length-1;e>=0;e--)n.push({index:o-1,partial:Object.assign(Object.assign({},r),{[i]:s[e]})})}}(n))yield Z(e)}function Z(e={}){const t=[...w];return e[r.tag]&&e[r.nthoftype]&&t.splice(t.indexOf(r.tag),1),t.map(t=>{return(o=e)[n=t]?o[n].join(""):"";var n,o}).join("")}function J(e,t){return[...e.map(e=>t+o.DESCENDANT+e),...e.map(e=>t+o.CHILD+e)]}function*K(e,t,n="",o,r=U()){const i=function*(e,t,n=U()){const o=new Set,r=n(e,t);for(const e of function*(e,t){for(const n of function(e){const{selectors:t,combineBetweenSelectors:n,includeTag:o,maxCandidates:r}=e,i=n?function(e=[],{maxResults:t=Number.POSITIVE_INFINITY}={}){return Array.from(k(e,{maxResults:t}))}(t,{maxResults:r}):t.map(e=>[e]);return o?i.map(H):i}(t))yield*z(n,e)}(r,t))o.has(e)||(o.add(e),yield e)}(e,o,r);for(const o of function*(e,t){if(""===t)yield*e;else for(const n of e)yield*J([n],t)}(i,n))y(e,o,t)&&(yield o)}function*Q(e,t,n="",o,r=U()){if(0===e.length)return null;const i=[e.length>1?e:[],...N(e,t).map(e=>[e])];for(const e of i)for(const i of K(e,t,n,o,r))yield{foundElements:e,selector:i}}function X(e){return{value:e,include:!1}}function ee({selectors:e,operator:t}){let n=[...w];e[r.tag]&&e[r.nthoftype]&&(n=n.filter(e=>e!==r.tag));let o="";return n.forEach(t=>{var n;(null!==(n=e[t])&&void 0!==n?n:[]).forEach(({value:e,include:t})=>{t&&(o+=e)})}),t+o}function te(e,t){const n=b(e,t).reverse(),i="object"==typeof(s=t)&&null!==s&&"nodeType"in s&&s.nodeType===Node.DOCUMENT_FRAGMENT_NODE&&"host"in s;var s;const c=n.map((e,t)=>{var n;const s=function(e,t,n=o.NONE){const r={};return t.forEach(t=>{Reflect.set(r,t,function(e,t){return q[t](e,void 0)}(e,t).map(X))}),{element:e,operator:n,selectors:r}}(e,[r.nthchild],i&&0===t?o.NONE:o.CHILD);return(null!==(n=s.selectors.nthchild)&&void 0!==n?n:[]).forEach(e=>{e.include=!0}),s});return[i?"":t?":scope":":root",...c.map(ee)].join("")}var ne=function(e,t){var n={};for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&t.indexOf(o)<0&&(n[o]=e[o]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var r=0;for(o=Object.getOwnPropertySymbols(e);r<o.length;r++)t.indexOf(o[r])<0&&Object.prototype.propertyIsEnumerable.call(e,o[r])&&(n[o[r]]=e[o[r]])}return n};function oe(e,t={}){return re(e,Object.assign(Object.assign({},t),{maxResults:1})).next().value}function*re(e,t={}){var o;const i=function(e){(e instanceof NodeList||e instanceof HTMLCollection)&&(e=Array.from(e));const t=(Array.isArray(e)?e:[e]).filter(n);return[...new Set(t)]}(e),s=function(e,t={}){const n=Object.assign(Object.assign({},c),t);return{selectors:(o=n.selectors,Array.isArray(o)?o.filter(e=>{return t=r,n=e,Object.values(t).includes(n);var t,n}):[]),whitelist:f(n.whitelist),blacklist:f(n.blacklist),root:p(n.root,e),combineWithinSelector:l(n.combineWithinSelector),combineBetweenSelectors:l(n.combineBetweenSelectors),includeTag:l(n.includeTag),maxCombinations:m(n.maxCombinations),maxCandidates:m(n.maxCandidates),useScope:l(n.useScope),maxResults:m(n.maxResults),ignoreGeneratedClassNames:l(n.ignoreGeneratedClassNames)};var o}(i[0],t),u=null!==(o=s.root)&&void 0!==o?o:S(i[0]);let a=0;for(const e of function*({elements:e,root:t,rootSelector:n="",options:o}){let r=t,i=n,s=!0;const c=U();for(;s;){let n=!1;for(const s of Q(e,r,i,o,c)){const{foundElements:o,selector:c}=s;if(n=!0,!y(e,c,t)){r=o[0],i=c;break}yield c}n||(s=!1)}}({elements:i,options:s,root:u,rootSelector:""}))if(yield e,a++,a>=s.maxResults)return;if(i.length>1){const{maxResults:e}=t,n=ne(t,["maxResults"]);if(yield i.map(e=>oe(e,n)).join(", "),a++,a>=s.maxResults)return}const d=void 0!==t.root;yield function(e,t){return e.map(e=>te(e,t)).join(", ")}(i,s.useScope||d?u:void 0)}const ie=oe;return t})());',Ol=`(function() {
    if(window.onload) window.onload = new Proxy(window.onload, {
        apply: function(target, receiver, args) {
            if(!window._readium_blockEvents) {
                Reflect.apply(target, receiver, args);
                return;
            }
            _readium_blockedEvents.push([
                0, target, receiver, args
            ]);
        }
    });
})();
`;let Ml=class{constructor(t){if(this.detectedTools=new Set,!t.onDetected)throw new Error("onDetected callback is required");this.options=t,this.setupDetection()}isAutomationToolPresent(){const t=window;return t.domAutomation||t.domAutomationController?"Selenium":navigator.webdriver===!0?"Puppeteer/Playwright":t.__webdriver_evaluate||t.__selenium_evaluate?"Chrome Automation":t.callPhantom||t._phantom?"PhantomJS":t.__nightmare?"Nightmare":t.$testCafe?"TestCafe":null}setupDetection(){const t=this.isAutomationToolPresent();if(t){this.handleDetected(t);return}this.observer=new MutationObserver(()=>{const e=this.isAutomationToolPresent();e&&!this.detectedTools.has(e)&&this.handleDetected(e)}),this.observer.observe(document.documentElement,{childList:!0,subtree:!0,attributes:!0}),window.addEventListener("unload",()=>this.destroy())}handleDetected(t){this.detectedTools.add(t),this.options.onDetected?.(t)}destroy(){this.observer?.disconnect(),this.observer=void 0,this.detectedTools.clear()}},Nl=0;function Ll(){return++Nl}const Ul=`
onmessage = function(event) {
  var action = event.data;
  var startTime = performance.now()

  console[action.type](...action.payload);
  postMessage({
    id: action.id,
    time: performance.now() - startTime
  })
}
`,Pn=class{constructor(t,e){this.callbacks=new Map,this.worker=t,this.blobUrl=e,this.worker.onmessage=i=>{const o=i.data,n=o.id,s=this.callbacks.get(o.id);s&&(s({time:o.time}),this.callbacks.delete(n))},this.log=(...i)=>this.send("log",...i),this.table=(...i)=>this.send("table",...i),this.clear=(...i)=>this.send("clear",...i)}async send(t,...e){const i=Ll();return new Promise((o,n)=>{this.callbacks.set(i,o),this.worker.postMessage({id:i,type:t,payload:e}),setTimeout(()=>{n(new Error("timeout")),this.callbacks.delete(i)},2e3)})}destroy(){this.worker.terminate(),URL.revokeObjectURL(this.blobUrl)}};Pn.workerScript=Ul;let Fn=Pn;function di(r){return typeof window<"u"&&console?console[r]:(...t)=>{}}const Al=di("log"),xn=di("table"),Hl=di("clear");async function kn(){if(typeof navigator<"u"&&navigator.brave&&navigator.brave.isBrave)try{return await Promise.race([navigator.brave.isBrave(),new Promise(r=>setTimeout(()=>r(!1),1e3))])}catch{return!0}return!1}function Il(r){return r.excludes.some(t=>t())?!1:r.includes.some(t=>t())}let Dl=class{constructor(t={}){if(this.isOpen=!1,this.checkCount=0,this.maxChecks=10,this.maxPrintTime=0,this.largeObjectArray=null,this.options={onDetected:t.onDetected||(()=>{}),onClosed:t.onClosed||(()=>{}),interval:t.interval||1e3,enableDebuggerDetection:t.enableDebuggerDetection||!1},!X.UA.Firefox)try{const e=new Blob([Fn.workerScript],{type:"application/javascript"}),i=URL.createObjectURL(e),o=new Worker(i);this.workerConsole=new Fn(o,i)}catch(e){console.warn("Failed to create Web Worker for DevTools detection:",e)}this.startDetection()}createLargeObjectArray(){const t={};for(let i=0;i<500;i++)t[`${i}`]=`${i}`;const e=[];for(let i=0;i<50;i++)e.push(t);return e}getLargeObjectArray(){return this.largeObjectArray===null&&(this.largeObjectArray=this.createLargeObjectArray()),this.largeObjectArray}async calcTablePrintTime(){const t=this.getLargeObjectArray();if(this.workerConsole)try{return(await this.workerConsole.table(t)).time}catch{const e=performance.now();return xn(t),performance.now()-e}else{const e=performance.now();return xn(t),performance.now()-e}}async calcLogPrintTime(){const t=this.getLargeObjectArray();if(this.workerConsole)return(await this.workerConsole.log(t)).time;{const e=performance.now();return Al(t),performance.now()-e}}isPerformanceDetectionEnabled(){return Il({includes:[()=>!!X.UA.Chrome,()=>!!X.UA.Chromium,()=>!!X.UA.Safari,()=>!!X.UA.Firefox],excludes:[]})}isDebuggerDetectionEnabled(){return this.options.enableDebuggerDetection}async checkPerformanceBased(){if(!this.isPerformanceDetectionEnabled())return!1;const t=await this.calcTablePrintTime(),e=Math.max(await this.calcLogPrintTime(),await this.calcLogPrintTime());return this.maxPrintTime=Math.max(this.maxPrintTime,e),this.workerConsole?await this.workerConsole.clear():Hl(),t===0?!1:this.maxPrintTime===0?!!await kn():t>this.maxPrintTime*10}async checkDebuggerBased(){if(!this.isDebuggerDetectionEnabled()||await kn())return!1;const t=performance.now();try{(()=>{}).constructor("debugger")()}catch{debugger}return performance.now()-t>100}async detectDevTools(){return await this.checkPerformanceBased()?!0:this.options.enableDebuggerDetection&&this.checkCount>=this.maxChecks?await this.checkDebuggerBased():!1}startDetection(){this.intervalId=window.setInterval(async()=>{this.checkCount++;const t=await this.detectDevTools();t!==this.isOpen&&(this.isOpen=t,t?this.options.onDetected():this.options.onClosed()),this.checkCount>this.maxChecks*2&&(this.checkCount=0)},this.options.interval),window.addEventListener("beforeunload",()=>this.destroy())}isDevToolsOpen(){return this.isOpen}async checkNow(){const t=this.isOpen;return this.isOpen=await this.detectDevTools(),this.isOpen!==t&&(this.isOpen?this.options.onDetected():this.options.onClosed()),this.isOpen}destroy(){this.intervalId&&(clearInterval(this.intervalId),this.intervalId=void 0),this.workerConsole&&(this.workerConsole.destroy(),this.workerConsole=void 0),this.isOpen=!1,this.checkCount=0}},$l=class{constructor(t){if(this.detected=!1,!t.onDetected)throw new Error("onDetected callback is required");this.options=t,this.setupDetection()}isIframed(){try{return window.self!==window.top?{isEmbedded:!0,isCrossOrigin:!window.top.location.href}:{isEmbedded:!1,isCrossOrigin:!1}}catch{return{isEmbedded:!0,isCrossOrigin:!0}}}setupDetection(){const{isEmbedded:t,isCrossOrigin:e}=this.isIframed();if(t){this.handleDetected(e);return}this.observer=new MutationObserver(()=>{const{isEmbedded:i,isCrossOrigin:o}=this.isIframed();i&&!this.detected&&(this.handleDetected(o),this.observer?.disconnect())}),this.observer.observe(document.documentElement,{childList:!0,subtree:!0,attributes:!0}),window.addEventListener("unload",()=>this.destroy())}handleDetected(t){this.detected=!0,this.options.onDetected?.(t)}destroy(){this.observer?.disconnect(),this.observer=void 0,this.detected=!1}},Wl=class{constructor(t={}){this.styleElement=null,this.beforePrintHandler=null,this.onPrintAttempt=t.onPrintAttempt,t.disable&&this.setupPrintProtection(t.watermark)}setupPrintProtection(t){const e=document.createElement("style");e.textContent=`
            @media print {
                body * {
                    display: none !important;
                }
                body::after {
                    content: "${t||"Printing has been disabled"}";
                    font-size: 200%;
                    display: block;
                    text-align: center;
                    margin-top: 50vh;
                    transform: translateY(-50%);
                }
            }
        `,document.head.appendChild(e),this.styleElement=e,this.beforePrintHandler=i=>(i.preventDefault(),this.onPrintAttempt?.(),!1),window.addEventListener("beforeprint",this.beforePrintHandler)}destroy(){this.beforePrintHandler&&(window.removeEventListener("beforeprint",this.beforePrintHandler),this.beforePrintHandler=null),this.styleElement?.parentNode&&(this.styleElement.parentNode.removeChild(this.styleElement),this.styleElement=null)}},Bl=class{constructor(t={}){this.onContextMenuBlocked=t.onContextMenuBlocked,this.contextMenuHandler=this.handleContextMenu.bind(this),document.addEventListener("contextmenu",this.contextMenuHandler,!0),window.addEventListener("unload",()=>this.destroy())}handleContextMenu(t){t.preventDefault(),t.stopPropagation();const e={type:"context_menu",timestamp:Date.now(),clientX:t.clientX,clientY:t.clientY,targetFrameSrc:""};return this.onContextMenuBlocked&&this.onContextMenuBlocked(e),!1}destroy(){this.contextMenuHandler&&(document.removeEventListener("contextmenu",this.contextMenuHandler,!0),this.contextMenuHandler=void 0)}};const ui="readium:navigator:suspiciousActivity";let jl=class{dispatchSuspiciousActivity(t,e){const i=new CustomEvent(ui,{detail:{type:t,timestamp:Date.now(),...e}});window.dispatchEvent(i)}constructor(t={}){t.monitorDevTools&&(this.devToolsDetector=new Dl({onDetected:()=>{this.dispatchSuspiciousActivity("developer_tools",{targetFrameSrc:"",key:"",code:"",keyCode:-1,ctrlKey:!1,altKey:!1,shiftKey:!1,metaKey:!1})}})),t.checkAutomation&&(this.automationDetector=new Ml({onDetected:e=>{this.dispatchSuspiciousActivity("automation_detected",{tool:e})}})),t.checkIFrameEmbedding&&(this.iframeEmbeddingDetector=new $l({onDetected:e=>{this.dispatchSuspiciousActivity("iframe_embedding_detected",{isCrossOrigin:e})}})),t.protectPrinting?.disable&&(this.printProtector=new Wl({...t.protectPrinting,onPrintAttempt:()=>{this.dispatchSuspiciousActivity("print",{})}})),t.disableContextMenu&&(this.contextMenuProtector=new Bl({onContextMenuBlocked:e=>{this.dispatchSuspiciousActivity("context_menu",e)}}))}destroy(){this.automationDetector?.destroy(),this.devToolsDetector?.destroy(),this.iframeEmbeddingDetector?.destroy(),this.printProtector?.destroy(),this.contextMenuProtector?.destroy()}};const mi="readium:navigator:keyboardPeripheral";let Gl=class{constructor(t={}){this.keyManager=new Yo,this.pagehideHandler=e=>{e.persisted||this.destroy()},this.dispatcher=e=>{const i=new CustomEvent(mi,{detail:e});window.dispatchEvent(i)},this.conditionBridge=new ai(t.keyboardPeripherals||[],e=>this.setupKeyboardPeripherals(e)),this.conditionBridge.setup(),window.addEventListener("pagehide",this.pagehideHandler)}setupKeyboardPeripherals(t){this.removeKeydownHandler(),t.length!==0&&(this.keydownHandler=this.keyManager.createUnifiedHandler("",t,this.dispatcher),document.addEventListener("keydown",this.keydownHandler,!0))}removeKeydownHandler(){this.keydownHandler&&(document.removeEventListener("keydown",this.keydownHandler,!0),this.keydownHandler=void 0)}destroy(){this.conditionBridge.destroy(),this.removeKeydownHandler(),window.removeEventListener("pagehide",this.pagehideHandler)}};const zn=r=>r.split(/[?#]/)[0],Vl=r=>{const t=zn(r);if(t.endsWith("/"))return t;try{const e=new URL(t);return e.pathname=e.pathname.substring(0,e.pathname.lastIndexOf("/")+1),e.href}catch{return t.replace(/[^/]*$/,"")}},Xl=(r,t="always",e)=>{const i=t==="always"||(t==="never"?!1:typeof e=="string"&&e.startsWith("https:")),o=r.join(" ");return[...i?["upgrade-insecure-requests"]:[],`default-src ${o} blob:`,"connect-src 'none'",`script-src ${o} blob: 'unsafe-inline'`,`style-src ${o} blob: 'unsafe-inline'`,`img-src ${o} blob: data:`,`font-src ${o} blob: data:`,`object-src ${o} blob:`,`child-src ${o}`,"form-action 'none'"].join("; ")};let Tn=class{constructor(t,e,i,o){this.pub=t,this.baseURL=e,this.item=i,this.injector=null,this.item=i,this.cssProperties=o.cssProperties,this.injector=o.injector??null,this.upgradeInsecureRequests=o.upgradeInsecureRequests??"always"}reset(){this.currentUrl&&URL.revokeObjectURL(this.currentUrl),this.currentUrl=void 0,this.currentResource?.close(),this.currentResource=void 0,this.pendingBuild=void 0}async build(t=!1){if(this.currentUrl)return this.currentUrl;if(this.pendingBuild)return this.pendingBuild;const e=this.doBuild(t).finally(()=>{this.pendingBuild===e&&(this.pendingBuild=void 0)});return this.pendingBuild=e,e}async doBuild(t){this.currentResource=this.pub.get(this.item);const e=await this.currentResource.link();if(!this.currentResource)return"about:blank";if(e.mediaType.isHTML){const i=await this.buildHtmlFrame(t);return this.currentUrl=i,i}else if(e.mediaType.isBitmap||e.mediaType.equals(ct.SVG)){const i=await this.buildImageFrame();return this.currentUrl=i,i}else throw Error("Unsupported frame mediatype "+e.mediaType.string)}async buildHtmlFrame(t=!1){if(!this.currentResource)throw new Error("No resource loaded");const e=await this.currentResource.link(),i=await this.currentResource.readAsXML();if(!i)throw new Error(`Failed reading item ${e.href}`);const o=i.querySelector("parsererror");if(o){const n=o.querySelector("div");throw new Error(`Failed parsing item ${e.href}: ${n?.textContent||o.textContent}`)}return this.injector&&await this.injector.injectForDocument(i,e),this.finalizeDOM(i,this.pub.baseURL,e.toURL(this.baseURL)||"",e.mediaType,t,this.cssProperties,this.upgradeInsecureRequests)}async buildImageFrame(){if(!this.currentResource)throw new Error("No resource loaded");const t=await this.currentResource.link(),e=t.toURL(this.baseURL)||"",i=document.implementation.createHTMLDocument(t.title||t.href);if((t?.height||0)>0&&(t?.width||0)>0){const s=i.createElement("meta");s.name="viewport",s.content=`width=${t.width}, height=${t.height}`,s.dataset.readium="true",i.head.appendChild(s)}const o=document.createElement("img");o.src=e||"",o.alt=t.title||"",await o.decode(),i.body.appendChild(o),this.injector&&await this.injector.injectForDocument(i,new gt({href:"readium-image-frame.xhtml",type:ct.XHTML.string}));const n=i.createElement("style");return n.dataset.readium="true",n.textContent=`
        html, body { width: 100%; height: 100%; margin: 0; padding: 0; font-size: 0; }
        img { margin: 0; padding: 0; border: 0; }`,i.head.appendChild(n),this.finalizeDOM(i,this.pub.baseURL,e,t.mediaType,!0,void 0,this.upgradeInsecureRequests)}async buildBlankFrame(t,e){const i=document.implementation.createHTMLDocument(this.item.title||this.item.href),o=i.createElement("meta");return o.name="viewport",o.content=`width=${t}, height=${e}`,o.dataset.readium="true",i.head.appendChild(o),this.injector&&await this.injector.injectForDocument(i,this.item.mediaType.isHTML?this.item:new gt({href:"readium-image-frame.xhtml",type:ct.XHTML.string})),this.reset(),this.currentUrl=this.finalizeDOM(i,this.pub.baseURL,this.item.toURL(this.baseURL)||"",ct.XHTML,!0,void 0,this.upgradeInsecureRequests),this.currentUrl}setProperties(t,e){for(const i in t){const o=t[i];o&&e.documentElement.style.setProperty(i,o)}}finalizeDOM(t,e,i,o,n=!1,s,a="always"){if(!t)return"";const h=(this.injector?.getAllowedDomains?.()||[]).map(zn),l=e?Vl(e):void 0,c=[...new Set([...l?[l]:[],...h])].filter(Boolean);if(s&&!n&&this.setProperties(s,t),t.body.querySelectorAll("img").forEach(u=>{u.setAttribute("fetchpriority","high"),u.setAttribute("referrerpolicy","origin")}),o.isHTML&&this.pub.metadata.languages?.[0]){const u=this.pub.metadata.languages[0];if(o===ct.XHTML){const m=t.documentElement.lang||t.documentElement.getAttribute("xml:lang"),p=t.body.lang||t.body.getAttribute("xml:lang");p&&!m?(t.documentElement.lang=p,t.documentElement.setAttribute("xml:lang",p),t.body.removeAttribute("xml:lang"),t.body.removeAttribute("lang")):m||(t.documentElement.lang=u,t.documentElement.setAttribute("xml:lang",u))}else o===ct.HTML&&!t.documentElement.lang&&(t.documentElement.lang=u)}if(te(this.pub.metadata)==="rtl"&&!t.documentElement.dir&&!t.body.dir&&(t.documentElement.dir=M.rtl),i!==void 0){const u=t.createElement("base");u.href=i,u.dataset.readium="true",t.head.prepend(u)}const d=t.createElement("meta");return d.httpEquiv="Content-Security-Policy",d.content=Xl(c,a,e),d.dataset.readium="true",t.head.prepend(d),URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(t)],{type:o.isHTML?o.string:"application/xhtml+xml"}))}},Dt=class{constructor(t,e={},i=[],o=[],n=[]){this.timelineFragmentIds=o,this.hidden=!0,this.destroyed=!1,this.pendingUnwatchSelectors=[],this.currModules=[],this.serialize=un(),this.frame=document.createElement("iframe"),this.frame.sandbox.value="allow-same-origin allow-scripts",this.frame.classList.add("readium-navigator-iframe"),this.frame.style.visibility="hidden",this.frame.ariaHidden="true",this.frame.style.opacity="0",this.frame.style.position="absolute",this.frame.style.pointerEvents="none",this.frame.style.transition="visibility 0s, opacity 0.1s linear",this.source=t,this.contentProtectionConfig={...e},this.keyboardPeripheralsConfig=[...i],this.resizeWatchSelectors=[...n]}async load(t){return this.serialize(()=>new Promise((e,i)=>{if(this.loader){const o=this.frame.contentWindow;if([...this.currModules].sort().join("|")===[...t].sort().join("|")){try{e(o)}catch{}return}this.comms?.halt(),this.loader.destroy(),this.loader=new we(o,t),this.currModules=t,this.comms=void 0,this.conditionBridge?.destroy();try{e(o)}catch{}return}this.frame.onload=()=>{const o=this.frame.contentWindow;this.loader=new we(o,t),this.currModules=t;try{e(o)}catch{}},this.frame.onerror=o=>{try{i(o)}catch{}},this.frame.contentWindow.location.replace(this.source)}))}applyContentProtection(){this.comms||this.comms.resume(),this.comms.send("peripherals_protection",this.contentProtectionConfig),this.keyboardPeripheralsConfig&&this.keyboardPeripheralsConfig.length>0&&(this.conditionBridge?.destroy(),this.conditionBridge=new ai(this.keyboardPeripheralsConfig,t=>{t.length>0&&this.comms.send("keyboard_peripherals",t)}),this.conditionBridge.setup()),this.contentProtectionConfig.monitorScrollingExperimental&&this.comms.send("scroll_protection",{}),this.contentProtectionConfig.protectPrinting?.disable&&this.comms.send("print_protection",this.contentProtectionConfig.protectPrinting),this.resizeWatchSelectors.forEach(t=>{this.comms.send("decoration_resize",{action:"watch",selector:t})}),this.pendingUnwatchSelectors.forEach(t=>{this.comms.send("decoration_resize",{action:"unwatch",selector:t})}),this.pendingUnwatchSelectors=[]}addResizeTarget(t){this.resizeWatchSelectors.includes(t)||this.resizeWatchSelectors.push(t),this.pendingUnwatchSelectors=this.pendingUnwatchSelectors.filter(e=>e!==t),this.comms?.ready&&this.comms.send("decoration_resize",{action:"watch",selector:t})}removeResizeTarget(t){this.resizeWatchSelectors=this.resizeWatchSelectors.filter(e=>e!==t),this.comms?.ready?this.comms.send("decoration_resize",{action:"unwatch",selector:t}):this.pendingUnwatchSelectors.includes(t)||this.pendingUnwatchSelectors.push(t)}async destroy(){return this.serialize(async()=>{this.conditionBridge?.destroy(),await this.hideNow(),this.loader?.destroy(),this.frame.remove(),this.destroyed=!0})}async hide(){return this.serialize(()=>this.hideNow())}async hideNow(){if(!this.destroyed){if(this.frame.style.visibility="hidden",this.frame.ariaHidden="true",this.frame.style.opacity="0",this.frame.style.pointerEvents="none",this.hidden=!0,this.frame.blur(),this.frame.parentElement)return this.comms===void 0||!this.comms.ready?void 0:new Promise((t,e)=>{this.comms?.send("unfocus",void 0,i=>{this.comms?.halt(),t()})});this.comms?.halt()}}async show(t){return this.serialize(()=>this.showNow(t))}async showNow(t){if(this.destroyed)throw Error("Trying to show frame when it doesn't exist");if(!this.frame.parentElement)throw Error("Trying to show frame that is not attached to the DOM");return this.comms?this.comms.resume():this.comms=new si(this.frame.contentWindow,this.source),new Promise((e,i)=>{this.comms?.send("activate",void 0,()=>{this.comms?.send("focus",void 0,()=>{this.applyContentProtection(),this.timelineFragmentIds.length>0&&this.comms?.send("timeline_entries",this.timelineFragmentIds);const o=()=>{this.frame.style.removeProperty("visibility"),this.frame.style.removeProperty("opacity"),this.frame.style.removeProperty("pointer-events"),this.frame.ariaHidden=null,this.hidden=!1,X.UA.WebKit&&this.comms?.send("force_webkit_recalc",void 0),e()};t!==void 0?this.comms?.send("go_progression",t,o):o()})})})}setCSSProperties(t){this.destroyed||!this.frame.contentWindow||(this.hidden&&!this.comms&&(this.comms=new si(this.frame.contentWindow,this.source),this.comms.halt()),this.comms?.send("update_properties",t))}get iframe(){if(this.destroyed)throw Error("Trying to use frame when it doesn't exist");return this.frame}get realSize(){if(this.destroyed)throw Error("Trying to use frame client rect when it doesn't exist");return this.frame.getBoundingClientRect()}get isDestroyed(){return this.destroyed}get window(){if(this.destroyed||!this.frame.contentWindow)throw Error("Trying to use frame window when it doesn't exist");return this.frame.contentWindow}get atLeft(){return this.window.scrollX<5}get atRight(){return this.window.scrollX>this.window.document.scrollingElement.scrollWidth-this.window.innerWidth-5}get msg(){return this.comms}get ldr(){return this.loader}};const On=10,Mn=5;class Kl{constructor(t,e,i,o,n,s,a,h=[],l){this.pool=new Map,this.blobs=new Map,this.inprogress=new Map,this.pendingUpdates=new Map,this.injector=null,this.updateSequence=0,this.container=t,this.positions=e,this.currentCssProperties=i,this.injector=o??null,this.contentProtectionConfig=n||{},this.keyboardPeripheralsConfig=s||[],this.getFragmentIds=a??(()=>[]),this.resizeWatchSelectors=[...h],this.upgradeInsecureRequests=l??"always"}addResizeTarget(t){this.resizeWatchSelectors.includes(t)||this.resizeWatchSelectors.push(t),this.pool.forEach(e=>e.addResizeTarget(t))}removeResizeTarget(t){this.resizeWatchSelectors=this.resizeWatchSelectors.filter(e=>e!==t),this.pool.forEach(e=>e.removeResizeTarget(t))}async destroy(){let t=this.inprogress.values(),e=t.next();const i=[];for(;e.value;)i.push(e.value),e=t.next();i.length>0&&await Promise.allSettled(i),this.inprogress.clear();let o=this.pool.values(),n=o.next();for(;n.value;)await n.value.destroy(),n=o.next();this.pool.clear(),this.blobs.forEach(s=>s.reset()),this.blobs.clear(),this.injector?.dispose(),this.container.childNodes.forEach(s=>{(s.nodeType===Node.ELEMENT_NODE||s.nodeType===Node.TEXT_NODE)&&s.remove()})}async update(t,e,i,o=!1){for(;this.forcedUpdate;)await this.forcedUpdate;const n=++this.updateSequence;let s=this.positions.findIndex(l=>l.locations.position===e.locations.position);if(s<0)throw Error(`Locator not found in position list: ${e.locations.position} > ${this.positions.reduce((l,c)=>c.locations.position||0>l?c.locations.position||0:l,0)}`);const a=this.positions[s].href;this.inprogress.has(a)&&await this.inprogress.get(a);const h=new Promise(async(l,c)=>{const d=[],u=[];this.positions.forEach((S,y)=>{(y>s+On||y<s-On)&&(d.includes(S.href)||d.push(S.href)),y<s+Mn&&y>s-Mn&&(u.includes(S.href)||u.push(S.href))}),d.forEach(async S=>{u.includes(S)||this.pool.has(S)&&(await this.pool.get(S)?.destroy(),this.pool.delete(S),this.pendingUpdates.has(S)&&this.pendingUpdates.set(S,{inPool:!1}))}),this.currentBaseURL!==void 0&&t.baseURL!==this.currentBaseURL&&(this.blobs.forEach(S=>S.reset()),this.blobs.clear()),this.currentBaseURL=t.baseURL,o&&(this.blobs.forEach(S=>S.reset()),this.blobs.clear(),this.pendingUpdates.clear());const m=async S=>{if(this.pendingUpdates.has(S)&&this.pendingUpdates.get(S)?.inPool===!1){const f=this.blobs.get(S);f&&(f.reset(),this.blobs.delete(S),this.pendingUpdates.delete(S))}if(this.pool.has(S)){const f=this.pool.get(S);if(!this.blobs.has(S))await f.destroy(),this.pool.delete(S),this.pendingUpdates.delete(S);else{await f.load(i);return}}const y=t.readingOrder.findWithHref(S);if(!y)return;this.blobs.has(S)||this.blobs.set(S,new Tn(t,this.currentBaseURL||"",y,{cssProperties:this.currentCssProperties,injector:this.injector,upgradeInsecureRequests:this.upgradeInsecureRequests}));const g=new Dt(await this.blobs.get(S).build(),this.contentProtectionConfig,this.keyboardPeripheralsConfig,this.getFragmentIds(S),this.resizeWatchSelectors);return S!==a&&await g.hide(),this.container.appendChild(g.iframe),await g.load(i),this.pool.set(S,g),g};try{await Promise.all(u.filter(S=>S===a).map(S=>m(S)))}catch(S){c(S);return}if(n!==this.updateSequence){l();return}Promise.all(u.filter(S=>S!==a&&!this.inprogress.has(S)).map(async S=>{const y=m(S);this.inprogress.set(S,y);try{await y}finally{this.inprogress.get(S)===y&&this.inprogress.delete(S)}})).catch(S=>console.warn("Failed preloading frame",S));const p=this.pool.get(a);if(!p){l();return}if(p?.source!==this._currentFrame?.source||o){if(await this._currentFrame?.hide(),n!==this.updateSequence){l();return}const S=this.pool.get(a);if(!S){l();return}if(await S.load(i),n!==this.updateSequence){l();return}const y=this.pool.get(a);if(!y){l();return}if(await y.show(e.locations.progression),this._currentFrame=y,p){const g=this.container.ownerDocument.activeElement;g&&g.tagName==="IFRAME"&&g!==p.iframe&&p.iframe.focus({preventScroll:!0})}}l()});if(this.inprogress.set(a,h),o){const l=h.catch(()=>{});this.forcedUpdate=l,l.then(()=>{this.forcedUpdate===l&&(this.forcedUpdate=void 0)})}try{await h}finally{this.inprogress.delete(a)}}setCSSProperties(t){if(!((e,i)=>{const o=Object.keys(e),n=Object.keys(i);if(o.length!==n.length)return!1;for(const s of o)if(e[s]!==i[s])return!1;return!0})(this.currentCssProperties||{},t)){this.currentCssProperties=t,this.pool.forEach(e=>{e.setCSSProperties(t)});for(const e of this.blobs.keys())this.pendingUpdates.set(e,{inPool:this.pool.has(e)})}}get currentFrames(){return[this._currentFrame]}_frameFor(t){return this.pool.get(t)}get currentBounds(){const t={x:0,y:0,width:0,height:0,top:0,right:0,bottom:0,left:0,toJSON(){return this}};return this.currentFrames.forEach(e=>{if(!e)return;const i=e.realSize;t.x=Math.min(t.x,i.x),t.y=Math.min(t.y,i.y),t.width+=i.width,t.height=Math.max(t.height,i.height),t.top=Math.min(t.top,i.top),t.right=Math.min(t.right,i.right),t.bottom=Math.min(t.bottom,i.bottom),t.left=Math.min(t.left,i.left)}),t}}var Yl=(r=>(r[r.Left=0]="Left",r[r.Center=1]="Center",r[r.Right=2]="Right",r))(Yl||{}),ql=(r=>(r[r.Top=0]="Top",r[r.Middle=1]="Middle",r[r.Bottom=2]="Bottom",r))(ql||{});class Zl{constructor(){this.outerWidth=0,this.outerHeight=0,this.HTML=document.documentElement,this.Head=document.head,this.Body=document.body}refreshOuterPixels(t){X.OS.iOS||(this.outerHeight=window.outerHeight-window.innerHeight,X.OS.Android&&X.UA.Chrome&&window.screen.height>window.innerHeight&&(this.outerHeight=(window.screen.height-window.innerHeight)/1.5),this.outerWidth=window.outerWidth-window.innerWidth)}getBibiEventCoord(t,e=0){const i={X:0,Y:0};return/^touch/.test(t.type)?(i.X=t.touches[e].screenX,i.Y=t.touches[e].screenY):(i.X=t.screenX,i.Y=t.screenY),(t.target.ownerDocument?.documentElement||t.target.documentElement)===this.HTML&&(i.X-=this.HTML.scrollLeft+this.Body.scrollLeft,i.Y-=this.HTML.scrollTop+this.Body.scrollTop),i.X-=this.outerWidth,i.Y-=this.outerHeight,i}getTouchDistance(t){if(t.touches.length!==2)return 0;const e=t.touches[0].screenX-this.outerWidth,i=t.touches[0].screenY-this.outerHeight,o=t.touches[1].screenX-this.outerWidth,n=t.touches[1].screenY-this.outerHeight;return Math.sqrt(Math.pow(o-e,2)+Math.pow(n-i,2))}getTouchCenter(t){if(t.touches.length!==2)return null;const e=this.HTML.scrollLeft+this.Body.scrollLeft,i=this.HTML.scrollTop+this.Body.scrollTop,o=t.touches[0].screenX-this.outerWidth-e,n=t.touches[0].screenY-this.outerHeight-i,s=t.touches[1].screenX-this.outerWidth-e,a=t.touches[1].screenY-this.outerHeight-i;return{X:(o+s)/2,Y:(n+a)/2}}getBibiEvent(t){if(!t)return{Coord:null,Division:null,Ratio:null,Target:null};const e=this.getBibiEventCoord(t);let i=.3;const o={X:e.X/window.innerWidth,Y:e.Y/window.innerHeight};let n,s,a,h;a=n=i,h=s=1-i;const l={X:null,Y:null};return o.X<a?l.X=0:h<o.X?l.X=2:l.X=1,o.Y<n?l.Y=0:s<o.Y?l.Y=2:l.Y=1,{Target:t.target,Coord:e,Ratio:o,Division:l}}}let Jl=class{constructor(){this._DOM={show:!1,pinchTarget:document.createElement("div"),touch1:document.createElement("div"),touch2:document.createElement("div"),center:document.createElement("div"),stats:document.createElement("div")},this._DOM.show=!0,this._DOM.pinchTarget.style.zIndex=this._DOM.stats.style.zIndex=this._DOM.center.style.zIndex=this._DOM.touch1.style.zIndex=this._DOM.touch2.style.zIndex="100000",this._DOM.pinchTarget.style.position=this._DOM.stats.style.position=this._DOM.center.style.position=this._DOM.touch1.style.position=this._DOM.touch2.style.position="absolute",this._DOM.pinchTarget.style.borderRadius=this._DOM.center.style.borderRadius=this._DOM.touch1.style.borderRadius=this._DOM.touch2.style.borderRadius="50%",this._DOM.pinchTarget.style.pointerEvents=this._DOM.stats.style.pointerEvents=this._DOM.center.style.pointerEvents=this._DOM.touch1.style.pointerEvents=this._DOM.touch2.style.pointerEvents="none",this._DOM.pinchTarget.style.display=this._DOM.center.style.display=this._DOM.touch1.style.display=this._DOM.touch2.style.display="none",this._DOM.pinchTarget.style.paddingTop=this._DOM.center.style.paddingTop="10px",this._DOM.pinchTarget.style.width=this._DOM.pinchTarget.style.height=this._DOM.center.style.width=this._DOM.center.style.height="10px",this._DOM.pinchTarget.style.backgroundColor="green",this._DOM.center.style.backgroundColor="red",this._DOM.touch1.style.backgroundColor=this._DOM.touch2.style.backgroundColor="blue",this._DOM.touch1.style.height=this._DOM.touch2.style.height="20px",this._DOM.touch1.style.width=this._DOM.touch2.style.width="20px",this._DOM.touch1.style.paddingTop=this._DOM.touch2.style.paddingTop="20px",this._DOM.touch1.textContent="1",this._DOM.touch2.textContent="2",this._DOM.stats.style.padding="20px",this._DOM.stats.style.backgroundColor="rgba(0,0,0,0.5)",this._DOM.stats.style.color="white",this._DOM.stats.textContent="[stats]",document.body.appendChild(this._DOM.stats),document.body.appendChild(this._DOM.center),document.body.appendChild(this._DOM.touch1),document.body.appendChild(this._DOM.touch2),document.body.appendChild(this._DOM.pinchTarget)}get show(){return this.DOM.show}get DOM(){return this._DOM}};const Nn=6,pi=1.02,Ln=50,_t=()=>typeof window.CSSTransformValue<"u";class Ql{constructor(t,e=!1){this.dragState=0,this.minimumMoved=!1,this.pan={startX:0,endX:0,startY:0,overscrollX:0,overscrollY:0,letItGo:!1,preventClick:!1,translateX:0,translateY:0,touchID:0},this.pinch={startDistance:0,startScale:0,target:{X:0,Y:0},touchN:0,startTranslate:{X:0,Y:0}},this._scale=1,this.scaleDebouncer=0,this.frameBounds=null,this.debugger=null,this.btouchstartHandler=this.touchstartHandler.bind(this),this.btouchendHandler=this.touchendHandler.bind(this),this.btouchmoveHandler=this.touchmoveHandler.bind(this),this.bdblclickHandler=this.dblclickHandler.bind(this),this.bmousedownHandler=this.mousedownHandler.bind(this),this.bmouseupHandler=this.mouseupHandler.bind(this),this.bmousemoveHandler=this.mousemoveHandler.bind(this),this.moveFrame=0,this.dragTranslate=null,this.dragTransform=null,this.manager=t,this.coordinator=new Zl,this.attachEvents(),e&&(this.debugger=new Jl)}get scale(){return this._scale}set scale(t){isNaN(t)&&(t=1),window.clearTimeout(this.scaleDebouncer),this.scaleDebouncer=window.setTimeout(()=>{this.dragState===0&&this.scale<pi&&(this.pan.translateX=0,this.pan.translateY=0,this.clearPan(),this.manager.updateBookStyle()),this.manager.listener("zoom",t)},100),this._scale=t}attachEvents(){this.observe(this.manager.spineElement),this.pan={startX:0,startY:0,endX:0,overscrollX:0,overscrollY:0,letItGo:!1,preventClick:!1,translateX:0,translateY:0,touchID:0},this.pinch={startDistance:0,startScale:0,target:{X:0,Y:0},startTranslate:{X:0,Y:0},touchN:0}}clearPan(){this.pan.letItGo=!1,this.pan.touchID=0,this.pan.endX=0,this.pan.overscrollX=0,this.pan.overscrollY=0}clearPinch(){this.pinch={startDistance:0,startScale:this.pinch.startScale,target:{X:0,Y:0},touchN:0,startTranslate:{X:0,Y:0}}}observe(t){t.addEventListener("touchstart",this.btouchstartHandler),t.addEventListener("touchend",this.btouchendHandler),t.addEventListener("touchmove",this.btouchmoveHandler,{passive:!0}),t.addEventListener("dblclick",this.bdblclickHandler,{passive:!0}),t.addEventListener("mousedown",this.bmousedownHandler),t.addEventListener("mouseup",this.bmouseupHandler),t.addEventListener("mousemove",this.bmousemoveHandler)}clickHandler(t){}touchstartHandler(t){if(["TEXTAREA","OPTION","INPUT","SELECT"].indexOf(t.target.nodeName)!==-1)return;switch(t.stopPropagation(),this.frameBounds=this.manager.currentBounds,this.coordinator.refreshOuterPixels(this.frameBounds),t.touches.length){case 3:return;case 2:{t.preventDefault(),this.pinch.startDistance=this.coordinator.getTouchDistance(t);const i=this.startTouch(t);this.pan.startX=i.X,this.pan.startY=i.Y,this.dragState=2,this.manager.updateBookStyle(!0),this.isScaled?(this.pinch.target.X-=this.pan.translateX*(this.pinch.startScale/this.scale),this.pinch.target.Y-=this.pan.translateY*(this.pinch.startScale/this.scale),this.pinch.target={X:0,Y:0},this.pinch.startScale=1/this.scale):(this.pinch.target={X:0,Y:0},this.pinch.startScale=this.scale),this.pinch.startTranslate={X:this.pan.translateX,Y:this.pan.translateY},this.debugger?.show&&(this.debugger.DOM.touch2.style.display="",this.debugger.DOM.center.style.display="",this.debugger.DOM.pinchTarget.style.display="");return}case 1:this.pan.touchID=t.touches[0].identifier,this.debugger?.show&&(this.debugger.DOM.touch1.style.display="");default:this.dragState<1&&(this.dragState=1),this.manager.updateBookStyle(!0)}this.manager.updateSpineStyle(!1);const e=this.startTouch(t);this.pan.startX=e.X,this.pan.startY=e.Y}startTouch(t){const e=this.coordinator.getTouchCenter(t)||this.coordinator.getBibiEventCoord(t);return{X:e.X-this.manager.width/2-this.pan.translateX*this.scale+this.manager.width/2,Y:e.Y-this.manager.height/2-this.pan.translateY*this.scale+this.manager.height/2}}touchendHandler(t){if(t.stopPropagation(),!t.touches||t.touches.length===0)this.pan.endX&&!this.isScaled?(this.pinch.touchN&&(this.pan.endX=this.pan.startX),this.updateAfterDrag()):!this.pinch.touchN&&Math.abs(this.pan.overscrollX)>Ln&&Math.abs(this.pan.overscrollY)<Ln/2&&(this.pan.startX=0,this.pan.endX=-this.pan.overscrollX,this.updateAfterDrag()),this.dragState=0,this.minimumMoved=!1,this.clearPinch(),this.debugger?.show&&(this.debugger.DOM.center.style.display="none",this.debugger.DOM.touch1.style.display="none",this.debugger.DOM.touch2.style.display="none");else if(t.touches.length===1){this.dragState=1,t.touches[0].identifier!==this.pan.touchID&&(this.pan.touchID=t.touches[0].identifier),this.debugger?.show&&(this.debugger.DOM.center.style.display="none",this.debugger.DOM.touch2.style.display="none",this.debugger.DOM.pinchTarget.style.display="none");const e=this.startTouch(t);this.pan.startX=e.X,this.pan.startY=e.Y}window.setTimeout(()=>{this.manager.updateBookStyle(!0),this.dragState===0&&(this.scale<pi&&(this.pan.translateX=0,this.pan.translateY=0),this.clearPan()),this.manager.updateBookStyle(!0)},50)}touchmoveHandler(t){t.stopPropagation();const e=this.coordinator.getBibiEventCoord(t);Math.abs(this.pan.startY-e.Y)+Math.abs(this.pan.startX-e.X)>5&&(this.minimumMoved||(this.manager.deselect(),this.minimumMoved=!0),this.dragState<1&&(this.dragState=1));const i=this.coordinator?.getTouchDistance(t);let o=!1;const n=this.scale;if(this.dragState===2&&i){if(this.pinch.touchN++,this.pinch.touchN<4)return;let s=i/this.pinch.startDistance*this.scale;s>=Nn&&(s=Nn),s<=pi&&(s=1),this.scale=s,this.pinch.startDistance=i,o=!0}if(this.pan.letItGo===!1&&(this.pan.letItGo=Math.abs(this.pan.startY-e.Y)<Math.abs(this.pan.startX-e.X)),this.debugger?.show&&(this.debugger.DOM.touch1.style.top=`${e.Y-10}px`,this.debugger.DOM.touch1.style.left=`${e.X-10}px`,this.debugger.DOM.touch1.innerText=`${e.X.toFixed(2)},${e.Y.toFixed(2)}`),this.dragState>0&&this.isScaled||this.dragState>1){if(this.dragState===1){const h={X:e.X-this.manager.width/2,Y:e.Y-this.manager.height/2};this.pan.translateX=(h.X-(this.pan.startX-this.manager.width/2))*1/this.scale,this.pan.translateY=(h.Y-(this.pan.startY-this.manager.height/2))*1/this.scale}else if(this.dragState===2){const h=this.coordinator.getTouchCenter(t);if(this.debugger?.show){this.debugger.DOM.center.style.top=`${h.Y-5}px`,this.debugger.DOM.center.style.left=`${h.X-5}px`,this.debugger.DOM.center.innerText=`${h.X.toFixed(2)},${h.Y.toFixed(2)}`;const m=this.coordinator.getBibiEventCoord(t,1);this.debugger.DOM.touch2.style.top=`${m.Y-10}px`,this.debugger.DOM.touch2.style.left=`${m.X-10}px`,this.debugger.DOM.touch2.innerText=`${m.X.toFixed(2)},${m.Y.toFixed(2)}`}h.X-=this.manager.width/2,h.Y-=this.manager.height/2;let l=-h.X/n;l+=h.X/this.scale,this.pinch.target.X+=l,h.X+=this.pinch.target.X*this.scale/this.pinch.startScale;let c=-h.Y/n;c+=h.Y/this.scale,this.pinch.target.Y+=c,h.Y+=this.pinch.target.Y*this.scale/this.pinch.startScale;let d=(h.X-(this.pan.startX-this.manager.width/2))*1/this.scale,u=(h.Y-(this.pan.startY-this.manager.height/2))*1/this.scale;this.pan.translateX=d,this.pan.translateY=u,this.debugger?.show&&(this.debugger.DOM.pinchTarget.style.left=`${this.pinch.target.X*this.scale/this.pinch.startScale-5+this.manager.width/2}px`,this.debugger.DOM.pinchTarget.style.top=`${this.pinch.target.Y*this.scale/this.pinch.startScale-5+this.manager.height/2}px`,this.debugger.DOM.pinchTarget.innerText=`${(this.pinch.target.X*this.scale/this.pinch.startScale).toFixed(2)},${(this.pinch.target.Y*this.scale/this.pinch.startScale).toFixed(2)}`)}const s=this.frameBounds.width/6,a=this.frameBounds.height/6;this.pan.translateX<-s&&(this.pan.overscrollX=-(s+this.pan.translateX),this.pan.translateX=-s),this.pan.translateY<-a&&(this.pan.overscrollY=-(a+this.pan.translateY),this.pan.translateY=-a),this.pan.translateX>s&&(this.pan.overscrollX=s-this.pan.translateX,this.pan.translateX=s),this.pan.translateY>a&&(this.pan.overscrollY=a-this.pan.translateY,this.pan.translateY=a),o=!0,this.debugger?.show&&(this.debugger.DOM.stats.innerText=`TX: ${this.pan.translateX.toFixed(2)}
TY: ${this.pan.translateY.toFixed(2)}
Zoom: ${this.scale.toFixed(2)}
Overscroll: ${this.pan.overscrollX.toFixed(2)},${this.pan.overscrollY.toFixed(2)}`)}if(o){this.manager.updateBookStyle();return}if(this.dragState>0&&this.pan.letItGo){this.pan.endX=e.X;const s=this.manager.currentSlide*(this.manager.width/this.manager.perPage),a=this.pan.endX-this.pan.startX,h=this.manager.rtl?s+a:s-a,l=window.devicePixelRatio||1,c=Math.round((this.manager.rtl?1:-1)*h*l)/l;cancelAnimationFrame(this.moveFrame),this.moveFrame=requestAnimationFrame(()=>{requestAnimationFrame(()=>{_t()?(this.dragTransform||(this.dragTranslate=new CSSTranslate(CSS.px(0),CSS.px(0),CSS.px(0)),this.dragTransform=new CSSTransformValue([this.dragTranslate])),this.dragTranslate.x.value=c,this.manager.spineElement.attributeStyleMap.set("transform",this.dragTransform)):this.manager.spineElement.style.transform=`translate3d(${c}px, 0, 0)`})})}}dblclickHandler(t){clearTimeout(this.dtimer),this.pdblclick=!0,this.dtimer=window.setTimeout(()=>this.pdblclick=!1,200),!this.disableDblClick&&this.isScaled&&(this.scale=1)}get isScaled(){return this.scale>1}addTouch(t){t.touches=[{pageX:t.pageX,pageY:t.pageY}]}mousedownHandler(t){this.isScaled&&(this.addTouch(t),this.touchstartHandler(t))}mouseupHandler(t){this.isScaled&&this.touchendHandler(t)}mousemoveHandler(t){this.isScaled&&t.buttons>0&&(t.preventDefault(),this.addTouch(t),this.touchmoveHandler(t))}updateAfterDrag(){const t=(this.manager.rtl?-1:1)*(this.pan.endX-this.pan.startX),e=Math.abs(t);t>0&&e>this.manager.threshold&&this.manager.slength>this.manager.perPage?this.manager.listener("no_less",void 0):t<0&&e>this.manager.threshold&&this.manager.slength>this.manager.perPage&&this.manager.listener("no_more",void 0),this.manager.slideToCurrent(!0,!0)}}let th=class{constructor(t,e,i,o={},n=[],s=[]){this.frameIsAppended=!1,this.pendingUnwatchSelectors=[],this.currModules=[],this.viewportSize=void 0,this.serialize=un(),this.cachedPage=void 0,this.peripherals=t,this.debugHref=i,this.contentProtectionConfig={...o},this.keyboardPeripheralsConfig=[...n],this.resizeWatchSelectors=[...s],this.frame=document.createElement("iframe"),this.frame.sandbox.value="allow-same-origin allow-scripts",this.frame.classList.add("readium-navigator-iframe"),this.frame.classList.add("blank"),this.frame.scrolling="no",this.frame.style.visibility="hidden",this.frame.ariaHidden="true",this.frame.style.display="none",this.frame.style.position="absolute",this.frame.style.pointerEvents="none",this.frame.style.transformOrigin="0 0",this.frame.style.transform="scale(1)",this.frame.style.background="#fff",this.frame.style.touchAction="none",this.frame.dataset.originalHref=i,this.source="about:blank",this.wrapper=document.createElement("div"),this.wrapper.style.position="relative",this.wrapper.style.contain="strict",this.wrapper.style.float=this.wrapper.style.cssFloat=e===M.rtl?"right":"left"}async load(t,e){return this.serialize(()=>this.loadNow(t,e))}async loadNow(t,e){return this.frameIsAppended||(this.wrapper.appendChild(this.frame),this.frameIsAppended=!0),this.source===e&&this.loadPromise&&[...this.currModules].sort().join("|")===[...t].sort().join("|")?this.loadPromise:(this.loaded&&this.source!==e&&this.window.stop(),this.source=e,this.loadPromise=new Promise((i,o)=>{if(this.loader&&this.loaded){const n=this.frame.contentWindow;if([...this.currModules].sort().join("|")===[...t].sort().join("|")){try{i(n),this.loadPromise=void 0}catch{}return}this.comms?.halt(),this.loader.destroy(),this.loader=new we(n,t),this.currModules=t,this.comms=void 0,this.conditionBridge?.destroy();try{i(n),this.loadPromise=void 0}catch{}return}this.frame.addEventListener("load",()=>{const n=this.frame.contentWindow;this.loader=new we(n,t),this.currModules=t,this.peripherals.observe(this.wrapper),this.peripherals.observe(n);try{i(n)}catch{}},{once:!0}),this.frame.addEventListener("error",n=>{try{o(n.error),this.loadPromise=void 0}catch{}},{once:!0}),this.frame.style.removeProperty("display"),this.frame.contentWindow.location.replace(this.source)}),this.loadPromise)}loadPageSize(){if(this.viewportSize)return this.viewportSize;const t=this.frame.contentWindow,e=t.document.head.querySelector("meta[name=viewport]");if(e){const i=/(\w+) *= *([^\s,]+)/g;let o,n=0,s=0;for(;o=i.exec(e.content);)o[1]==="width"?n=Number.parseFloat(o[2]):o[1]==="height"&&(s=Number.parseFloat(o[2]));if(n>0&&s>0)return this.viewportSize={width:n,height:s},this.viewportSize}return{width:t.document.body.scrollWidth,height:t.document.body.scrollHeight}}update(t){if(!this.loaded)return;const e=this.loadPageSize(),i=Math.min(this.wrapper.clientWidth/e.width,this.wrapper.clientHeight/e.height);_t()?(this.frame.attributeStyleMap.set("width",CSS.px(e.width)),this.frame.attributeStyleMap.set("height",CSS.px(e.height)),this.frame.attributeStyleMap.set("transform",new CSSTransformValue([new CSSScale(i,i)]))):(this.frame.style.height=`${e.height}px`,this.frame.style.width=`${e.width}px`,this.frame.style.transform=`scale(${i})`);const o=this.frame.getBoundingClientRect(),n=this.wrapper.clientHeight-o.height;if(_t())if(this.frame.attributeStyleMap.set("top",CSS.px(n/2)),t===tt.left){const s=this.wrapper.clientWidth-o.width;this.frame.attributeStyleMap.set("left",CSS.px(s))}else if(t===tt.center){const s=this.wrapper.clientWidth-o.width;this.frame.attributeStyleMap.set("left",CSS.px(s/2))}else this.frame.attributeStyleMap.set("left",CSS.px(0));else if(this.frame.style.top=`${n/2}px`,t===tt.left){const s=this.wrapper.clientWidth-o.width;this.frame.style.left=`${s}px`}else if(t===tt.center){const s=this.wrapper.clientWidth-o.width;this.frame.style.left=`${s/2}px`}else this.frame.style.left="0px";this.frame.style.removeProperty("visibility"),this.frame.ariaHidden=null,this.frame.style.removeProperty("pointer-events"),this.frame.classList.remove("blank"),this.frame.classList.add("loaded")}async destroy(){return this.serialize(async()=>{this.conditionBridge?.destroy(),await this.unfocusNow(),this.loader?.destroy(),this.wrapper.remove()})}async unload(){return this.serialize(()=>this.unloadNow())}async unloadNow(){if(this.loaded)return this.deselect(),this.frame.style.visibility="hidden",this.frame.ariaHidden="true",this.frame.style.pointerEvents="none",this.frame.classList.add("blank"),this.frame.classList.remove("loaded"),this.comms?.halt(),this.loader?.destroy(),this.comms=void 0,this.conditionBridge?.destroy(),this.frame.blur(),new Promise((t,e)=>{this.frame.addEventListener("load",()=>{try{this.showPromise=void 0,t()}catch{}},{once:!0}),this.frame.addEventListener("error",i=>{try{this.showPromise=void 0,e(i.error)}catch{}},{once:!0}),this.source="about:blank",this.frame.contentWindow.location.replace("about:blank"),this.frame.style.display="none",this.frame.style.width="0px",this.frame.style.height="0px"})}deselect(){this.frame.contentWindow?.getSelection()?.removeAllRanges()}async unfocus(){return this.serialize(()=>this.unfocusNow())}async unfocusNow(){if(this.frame.parentElement)return this.comms===void 0||!this.comms.ready?void 0:(this.frame.blur(),new Promise((t,e)=>{this.comms?.send("unfocus",void 0,i=>{this.comms?.halt(),this.showPromise=void 0,t()})}));this.comms?.halt()}applyContentProtection(){this.comms||this.comms.resume(),this.comms.send("peripherals_protection",this.contentProtectionConfig),this.keyboardPeripheralsConfig&&this.keyboardPeripheralsConfig.length>0&&(this.conditionBridge?.destroy(),this.conditionBridge=new ai(this.keyboardPeripheralsConfig,t=>{t.length>0&&this.comms.send("keyboard_peripherals",t)}),this.conditionBridge.setup()),this.contentProtectionConfig.protectPrinting?.disable&&this.comms.send("print_protection",this.contentProtectionConfig.protectPrinting),this.resizeWatchSelectors.forEach(t=>{this.comms.send("decoration_resize",{action:"watch",selector:t})}),this.pendingUnwatchSelectors.forEach(t=>{this.comms.send("decoration_resize",{action:"unwatch",selector:t})}),this.pendingUnwatchSelectors=[]}addResizeTarget(t){this.resizeWatchSelectors.includes(t)||this.resizeWatchSelectors.push(t),this.pendingUnwatchSelectors=this.pendingUnwatchSelectors.filter(e=>e!==t),this.comms?.ready&&this.comms.send("decoration_resize",{action:"watch",selector:t})}removeResizeTarget(t){this.resizeWatchSelectors=this.resizeWatchSelectors.filter(e=>e!==t),this.comms?.ready?this.comms.send("decoration_resize",{action:"unwatch",selector:t}):this.pendingUnwatchSelectors.includes(t)||this.pendingUnwatchSelectors.push(t)}async show(t){return this.serialize(()=>this.showNow(t))}async showNow(t){if(!this.frame.parentElement){console.warn("Trying to show frame that is not attached to the DOM");return}if(!this.loaded){this.showPromise=void 0;return}return this.showPromise?(this.cachedPage!==t&&(this.update(t),this.cachedPage=t),this.showPromise):(this.cachedPage=t,this.comms?this.comms.resume():this.comms=new si(this.frame.contentWindow,this.source),this.showPromise=new Promise((e,i)=>{this.comms.send("focus",void 0,o=>{this.update(this.cachedPage),this.applyContentProtection(),e()})}),this.showPromise)}async activate(){return this.serialize(()=>new Promise((t,e)=>{if(!this.comms?.ready)return t();this.comms?.send("activate",void 0,()=>{t()})}))}get element(){return this.wrapper}get iframe(){return this.frame}get realSize(){return this.frame.getBoundingClientRect()}get loaded(){return this.frame.contentWindow&&this.frame.contentWindow.location.href!=="about:blank"}set width(t){if(_t()){const e=this.wrapper.attributeStyleMap.get("width");if(e instanceof CSSUnitValue&&e.unit==="percent"&&e.value===t)return;this.wrapper.attributeStyleMap.set("width",CSS.percent(t))}else{const e=`${t}%`;if(this.wrapper.style.width===e)return;this.wrapper.style.width=e}}set height(t){if(_t()){const e=this.wrapper.attributeStyleMap.get("height");if(e instanceof CSSUnitValue&&e.unit==="px"&&e.value===t)return;this.wrapper.attributeStyleMap.set("height",CSS.px(t))}else{const e=`${t}px`;if(this.wrapper.style.height===e)return;this.wrapper.style.height=e}}get window(){if(!this.frame.contentWindow)throw Error("Trying to use frame window when it doesn't exist");return this.frame.contentWindow}get atLeft(){return this.window.scrollX<5}get atRight(){return this.window.scrollX>this.window.document.scrollingElement.scrollWidth-this.window.innerWidth-5}get msg(){return this.comms}get ldr(){return this.loader}};var gi=(r=>(r.auto="auto",r.landscape="landscape",r.portrait="portrait",r))(gi||{}),fi=(r=>(r.auto="auto",r.both="both",r.none="none",r.landscape="landscape",r))(fi||{});let eh=class{constructor(t){this.shift=!0,this.spreads=[],this.nLandscape=0,this.index(t),this.testShift(t),console.log(`Indexed ${this.spreads.length} spreads for ${t.readingOrder.items.length} items`)}index(t,e=!1){this.nLandscape=0,t.readingOrder.items.forEach((i,o)=>{e||(t.readingOrder.items[o]=i.addProperties({number:o+1,isImage:i.type?.indexOf("image/")===0}));const n=i.properties?.otherProperties.orientation==="landscape";(!i.properties?.page||e)&&(i.properties=i.properties?.add({page:n?"center":((this.shift?0:1)+o-this.nLandscape)%2?t.metadata.readingProgression===M.rtl?"right":"left":t.metadata.readingProgression===M.rtl?"left":"right"})),(n||i.properties?.otherProperties.addBlank)&&this.nLandscape++}),e&&(this.spreads=[]),this.buildSpreads(t.readingOrder)}testShift(t){let e=!1;this.spreads.forEach((i,o)=>{if(i.length>1)return;const n=i[0],s=n.properties?.otherProperties.orientation;o===0&&(s==="landscape"||s!=="portrait"&&((n.width||0)>(n.height||0)||n.properties?.otherProperties.spread==="both"))&&(this.shift=!1),e&&n.properties?.page===tt.center&&this.spreads[o-1][0].addProperties({addBlank:!0}),s==="portrait"&&n.properties?.page!=="center"&&n.properties?.otherProperties.number>1?e=!0:e=!1}),this.shift||this.index(t,!0)}buildSpreads(t){let e=[];t.items.forEach((i,o)=>{!o&&this.shift?this.spreads.push([i]):i.properties?.page===tt.center?(e.length>0&&this.spreads.push(e),this.spreads.push([i]),e=[]):e.length>=2?(this.spreads.push(e),e=[i]):e.push(i)}),e.length>0&&this.spreads.push(e)}currentSpread(t,e){return this.spreads[Math.min(Math.floor(t/e),this.spreads.length-1)]}findByLink(t){return this.spreads.find(e=>e.includes(t))||void 0}};const Un=8,An=5,ih=300,oh=15e3,nh=250,Hn=150,In=500;class rh{constructor(t,e,i,o,n,s,a,h=[],l){if(this.pool=new Map,this.blobs=new Map,this.inprogress=new Map,this.delayedShow=new Map,this.delayedTimeout=new Map,this.previousFrames=[],this.injector=null,this.width=0,this.height=0,this.currentSlide=0,this.spread=!0,this.orientationInternal=-1,this.bookScale=null,this.bookTranslate=null,this.bookTransform=null,this.container=t,this.positions=e,this.pub=i,this.injector=n??null,this.contentProtectionConfig=s||{},this.keyboardPeripheralsConfig=a||[],this.resizeWatchSelectors=[...h],this.upgradeInsecureRequests=l??"always",this.spreadPresentation=i.metadata.otherMetadata?.spread||fi.auto,this.pub.metadata.effectiveReadingProgression!==M.rtl&&this.pub.metadata.effectiveReadingProgression!==M.ltr)throw Error("Unsupported reading progression for fixed-layout EPUB");this.spreader=new eh(this.pub),this.containerHeightCached=t.clientHeight,this.bookElement=document.createElement("div"),this.bookElement.ariaLabel="Book",this.bookElement.tabIndex=-1,this.updateBookStyle(!0),this.spineElement=document.createElement("div"),this.spineElement.ariaLabel="Spine",this.bookElement.appendChild(this.spineElement),this.container.appendChild(this.bookElement),this.updateSpineStyle(!0),this.peripherals=new Ql(this);const c=document.createDocumentFragment();this.pub.readingOrder.items.forEach(d=>{const u=new th(this.peripherals,this.pub.metadata.effectiveReadingProgression,d.href,this.contentProtectionConfig,this.keyboardPeripheralsConfig,this.resizeWatchSelectors);this.pool.set(d.href,u),u.width=100/this.length*(d.properties?.otherProperties.orientation===gi.landscape||d.properties?.otherProperties.addBlank?this.perPage:1),u.height=this.height,c.appendChild(u.wrapper)}),this.spineElement.appendChild(c)}set listener(t){this._listener=t}get listener(){return this._listener}get doNotDisturb(){return this.peripherals.pan.touchID>0}resizeHandler(t=!0,e=!0){this.currentSlide+this.perPage>this.length&&(this.currentSlide=this.length<=this.perPage?0:this.length-1),this.containerHeightCached=this.container.clientHeight,this.orientationInternal=-1,this.updateSpineStyle(!0),t&&(this.currentSlide=this.reAlign(),this.slideToCurrent(!e,e)),clearTimeout(this.resizeTimeout),this.resizeTimeout=window.setTimeout(()=>{const i=100/this.length,o=new Map(this.pub.readingOrder.items.map(n=>[n.href,n]));this.pool.forEach((n,s)=>{const a=o.get(s);a&&requestAnimationFrame(()=>{if(n.width=i*(a.properties?.otherProperties.orientation===gi.landscape||a.properties?.otherProperties.addBlank?this.perPage:1),n.height=this.height,!n.loaded)return;const h=this.spreader.findByLink(a);n.update(this.spreadPosition(h,a))})})},nh)}updateDimensions(){this.width=this.bookElement.clientWidth,this.height=this.bookElement.clientHeight}get rtl(){return this.pub.metadata.effectiveReadingProgression===M.rtl}get single(){return!this.spread||this.portrait}get perPage(){return this.spread&&!this.portrait?2:1}get threshold(){return 50}get portrait(){return this.spreadPresentation===fi.none?!0:(this.orientationInternal===-1&&(this.orientationInternal=this.containerHeightCached>this.container.clientWidth?1:0),this.orientationInternal===1)}updateSpineStyle(t,e=!0){let i=0;if(this.updateDimensions(),this.perPage>1&&(i=this.width/2),_t())this.spineElement.attributeStyleMap.set("transition",new CSSUnparsedValue([t?`all ${e?Hn:In}ms ease-out`:"all 0ms ease-out"])),this.spineElement.attributeStyleMap.set("margin-right",CSS.px(this.rtl?i:0)),this.spineElement.attributeStyleMap.set("margin-left",CSS.px(this.rtl?0:i)),this.spineElement.attributeStyleMap.set("width",CSS.px(this.width/this.perPage*this.length)),this.transform?this.spineElement.attributeStyleMap.set("transform",new CSSTransformValue([new CSSTranslate(CSS.px(this.transform||0),CSS.px(0),CSS.px(0))])):this.spineElement.attributeStyleMap.delete("transform"),this.spineElement.attributeStyleMap.set("contain",new CSSUnparsedValue(["content"]));else{const o={transition:t?`all ${e?Hn:In}ms ease-out`:"all 0ms ease-out",marginRight:this.rtl?`${i}px`:"0",marginLeft:this.rtl?"0":`${i}px`,width:`${this.width/this.perPage*this.length}px`,transform:this.transform?`translate3d(${this.transform}px, 0px, 0px)`:"",contain:"content"};Object.assign(this.spineElement.style,o)}}updateBookStyle(t=!1){if(t){const n={overflow:"hidden",direction:this.pub.metadata.effectiveReadingProgression,cursor:"",height:"100%",width:"100%",position:"relative",outline:"none",transition:this.peripherals?.dragState?"none":"transform .15s ease-in-out",touchAction:"none"};Object.assign(this.bookElement.style,n)}const e=this.peripherals?.scale||1,i=this.peripherals?.pan.translateX||0,o=this.peripherals?.pan.translateY||0;_t()?(this.bookTransform||(this.bookScale=new CSSScale(1,1),this.bookTranslate=new CSSTranslate(CSS.px(0),CSS.px(0),CSS.px(0)),this.bookTransform=new CSSTransformValue([this.bookScale,this.bookTranslate])),this.bookScale.x.value=e,this.bookScale.y.value=e,this.bookTranslate.x.value=i,this.bookTranslate.y.value=o,this.bookElement.attributeStyleMap.set("transform",this.bookTransform)):this.bookElement.style.transform=`scale(${e}) translate3d(${i}px, ${o}px, 0px)`}goTo(t){if(this.slength<=this.perPage)return;t=this.reAlign(t);const e=this.currentSlide;this.currentSlide=Math.min(Math.max(t,0),this.length-1),e!==this.currentSlide&&this.slideToCurrent(!1)}onChange(){this.peripherals.scale=1,this.updateBookStyle()}get offset(){return(this.rtl?1:-1)*this.currentSlide*(this.width/this.perPage)}get length(){if(this.single)return this.slength;const t=this.slength+this.nLandscape;return this.shift&&t%2===0?t+1:t}get slength(){return this.pub.readingOrder.items.length||0}get shift(){return this.spreader.shift}get nLandscape(){return this.spreader.nLandscape}setPerPage(t){t===null?this.spread=!0:t===1?this.spread=!1:this.spread=!0,requestAnimationFrame(()=>this.resizeHandler(!0))}slideToCurrent(t,e=!0){this.updateDimensions(),t?requestAnimationFrame(()=>{requestAnimationFrame(()=>{this.transform=this.offset,this.updateSpineStyle(!0,e),this.deselect()})}):(this.transform=this.offset,this.updateSpineStyle(!1),this.deselect())}bounce(t=!1){requestAnimationFrame(()=>{this.transform=this.offset+50*(t?1:-1),this.updateSpineStyle(!0,!0),setTimeout(()=>{this.transform=this.offset,this.updateSpineStyle(!0,!0)},100)})}next(t=1){if(this.slength<=this.perPage)return!1;const e=this.currentSlide;return this.currentSlide=Math.min(this.currentSlide+t,this.length-1),this.perPage>1&&this.currentSlide%2&&this.currentSlide--,this.currentSlide===e&&(this.currentSlide+1,this.length),e!==this.currentSlide?(this.slideToCurrent(!0),this.onChange(),!0):(this.bounce(this.rtl),!1)}prev(t=1){if(this.slength<=this.perPage)return!1;const e=this.currentSlide;return this.currentSlide=Math.max(this.currentSlide-t,0),this.perPage>1&&this.currentSlide%2&&this.currentSlide++,e!==this.currentSlide?(this.slideToCurrent(!0),this.onChange(),!0):(this.bounce(!this.rtl),!1)}get ownerWindow(){return this.container.ownerDocument.defaultView||window}async destroy(){let t=this.inprogress.values(),e=t.next();const i=[];for(;e.value;)i.push(e.value),e=t.next();i.length>0&&await Promise.allSettled(i),this.inprogress.clear();let o=this.pool.values(),n=o.next();for(;n.value;)await n.value.destroy(),n=o.next();this.pool.clear(),this.blobs.forEach(s=>s.reset()),this.blobs.clear(),this.injector?.dispose(),this.container.childNodes.forEach(s=>{(s.nodeType===Node.ELEMENT_NODE||s.nodeType===Node.TEXT_NODE)&&s.remove()})}makeSpread(t){return this.perPage<2?[this.pub.readingOrder.items[t]]:this.spreader.currentSpread(t,this.perPage)}reAlign(t=this.currentSlide){return t%2&&!this.single&&t++,t}spreadPosition(t,e){return this.perPage<2||t.length<2?tt.center:e.href===t[0].href?this.rtl?tt.right:tt.left:this.rtl?tt.left:tt.right}async waitForItem(t){if(this.inprogress.has(t)&&await this.inprogress.get(t),this.delayedShow.has(t)){const e=this.delayedTimeout.get(t);e>0?clearTimeout(e):await this.delayedShow.get(t),this.delayedTimeout.set(t,0),this.delayedShow.delete(t)}}async cancelShowing(t){if(this.delayedShow.has(t)){const e=this.delayedTimeout.get(t);e>0&&clearTimeout(e),this.delayedShow.delete(t)}}async update(t,e,i,o=!1){let n=this.pub.readingOrder.items.findIndex(h=>h.href===e.href);if(n<0)throw Error("Href not found in reading order");this.currentSlide!==n&&(this.currentSlide=this.reAlign(n),this.slideToCurrent(!0));const s=this.makeSpread(this.currentSlide);this.perPage>1&&n++;for(const h of s)await this.waitForItem(h.href);const a=new Promise(async(h,l)=>{const c=[],d=[];this.positions.forEach((g,f)=>{(f>n+Un||f<n-Un)&&(c.includes(g.href)||c.push(g.href)),f<n+An&&f>n-An&&(d.includes(g.href)||d.push(g.href))}),c.forEach(async g=>{d.includes(g)||this.pool.has(g)&&(this.cancelShowing(g),await this.pool.get(g)?.unload(),this.blobs.get(g)?.reset())}),this.currentBaseURL!==void 0&&t.baseURL!==this.currentBaseURL&&(this.blobs.forEach(g=>g.reset()),this.blobs.clear()),this.currentBaseURL=t.baseURL;const u=async g=>{const f=t.readingOrder.findIndexWithHref(g),v=t.readingOrder.items[f];if(v&&(this.blobs.has(g)||this.blobs.set(g,new Tn(t,this.currentBaseURL||"",v,{injector:this.injector,upgradeInsecureRequests:this.upgradeInsecureRequests})),!this.delayedShow.has(g))){const R=new Promise((E,P)=>{let F=!1;const x=window.setTimeout(async()=>{this.delayedTimeout.set(g,0);try{const W=this.makeSpread(this.reAlign(f)),I=this.spreadPosition(W,v),Z=this.pool.get(g);await Z.load(i,await this.blobs.get(g).build(!0)),this.peripherals.isScaled||await Z.show(I)}catch(W){console.warn(`Failed preloading ${g}`,W)}this.delayedShow.delete(g),F=!0,E()},ih);setTimeout(()=>{!F&&this.delayedShow.get(g)===R&&P(`Offscreen load timeout: ${g}`)},oh),this.delayedTimeout.set(g,x)});this.delayedShow.set(g,R)}};try{await Promise.all(d.map(g=>u(g)))}catch(g){l(g);return}const m=[],p=[],S=[];for(const g of s){const f=this.pool.get(g.href),v=this.blobs.get(g.href);if(v){this.cancelShowing(g.href);try{await f.load(i,await v.build(!0)),await f.show(this.spreadPosition(s,g)),this.previousFrames.push(f),await f.activate(),m.push(f)}catch(R){console.warn(`Failed showing ${g.href}`,R),p.push(R),S.push(g)}}}if(m.length>0){const g=m[0].loadPageSize();for(const f of S){const v=this.pool.get(f.href),R=this.blobs.get(f.href);if(R)try{await v.load(i,await R.buildBlankFrame(g.width,g.height)),await v.show(this.spreadPosition(s,f)),this.previousFrames.push(v),await v.activate(),m.push(v)}catch(E){console.warn(`Failed showing a blank page for ${f.href}`,E)}}}else if(p.length>0){l(p[0]);return}for(;this.previousFrames.length>0;){const g=this.previousFrames.shift();g&&!m.includes(g)&&await g.unfocus()}this.previousFrames=m;const y=this.container.ownerDocument.activeElement;y&&y.tagName==="IFRAME"&&!m.some(g=>g.iframe===y)&&m[0]?.iframe.focus({preventScroll:!0}),h()});for(const h of s)this.inprogress.set(h.href,a);try{await a}finally{for(const h of s)this.inprogress.delete(h.href)}}addResizeTarget(t){this.resizeWatchSelectors.includes(t)||this.resizeWatchSelectors.push(t),this.pool.forEach(e=>e.addResizeTarget(t))}removeResizeTarget(t){this.resizeWatchSelectors=this.resizeWatchSelectors.filter(e=>e!==t),this.pool.forEach(e=>e.removeResizeTarget(t))}get currentFrames(){if(this.perPage<2){const t=this.pub.readingOrder.items[this.currentSlide];return[this.pool.get(t.href)]}return this.spreader.currentSpread(this.currentSlide,this.perPage).map(t=>this.pool.get(t.href))}get currentBounds(){const t={x:0,y:0,width:0,height:0,top:0,right:0,bottom:0,left:0,toJSON(){return this}};return this.currentFrames.forEach(e=>{if(!e)return;const i=e.realSize;t.x=Math.min(t.x,i.x),t.y=Math.min(t.y,i.y),t.width+=i.width,t.height=Math.max(t.height,i.height),t.top=Math.min(t.top,i.top),t.right=Math.min(t.right,i.right),t.bottom=Math.min(t.bottom,i.bottom),t.left=Math.min(t.left,i.left)}),t}get viewport(){const t={readingOrder:[],progressions:new Map,positions:null};return(this.perPage<2?[this.pub.readingOrder.items[this.currentSlide]]:this.spreader.currentSpread(this.currentSlide,this.perPage)).forEach(e=>{t.readingOrder.push(e.href),t.progressions.set(e.href,{start:0,end:1})}),t.positions=this.getCurrentNumbers(),t}getCurrentNumbers(){if(this.perPage<2)return[this.pub.readingOrder.items[this.currentSlide].properties?.otherProperties.number];const t=this.spreader.currentSpread(this.currentSlide,this.perPage);return t.length>1?[t[0].properties?.otherProperties.number,t[t.length-1].properties?.otherProperties.number]:[t[0].properties?.otherProperties.number]}deselect(){this.currentFrames?.forEach(t=>t?.deselect())}}let Fe=class zi{constructor(t={}){this.backgroundColor=Y(t.backgroundColor),this.blendFilter=H(t.blendFilter),this.constraint=k(t.constraint),this.columnCount=k(t.columnCount),this.darkenFilter=Ht(t.darkenFilter),this.deprecatedFontSize=H(t.deprecatedFontSize),this.fontFamily=Y(t.fontFamily),this.fontSize=It(t.fontSize,Re.range),this.fontSizeNormalize=H(t.fontSizeNormalize),this.fontOpticalSizing=H(t.fontOpticalSizing),this.fontWeight=It(t.fontWeight,Ce.range),this.fontWidth=It(t.fontWidth,Ee.range),this.hyphens=H(t.hyphens),this.invertFilter=Ht(t.invertFilter),this.invertGaijiFilter=Ht(t.invertGaijiFilter),this.iOSPatch=H(t.iOSPatch),this.iPadOSPatch=H(t.iPadOSPatch),this.letterSpacing=k(t.letterSpacing),this.ligatures=H(t.ligatures),this.lineHeight=k(t.lineHeight),this.linkColor=Y(t.linkColor),this.noRuby=H(t.noRuby),this.pageGutter=k(t.pageGutter),this.paragraphIndent=k(t.paragraphIndent),this.paragraphSpacing=k(t.paragraphSpacing),this.scroll=H(t.scroll),this.scrollPaddingTop=k(t.scrollPaddingTop),this.scrollPaddingBottom=k(t.scrollPaddingBottom),this.scrollPaddingLeft=k(t.scrollPaddingLeft),this.scrollPaddingRight=k(t.scrollPaddingRight),this.selectionBackgroundColor=Y(t.selectionBackgroundColor),this.selectionTextColor=Y(t.selectionTextColor),this.textAlign=wn(t.textAlign,ee),this.textColor=Y(t.textColor),this.textNormalization=H(t.textNormalization),this.visitedColor=Y(t.visitedColor),this.wordSpacing=k(t.wordSpacing),this.optimalLineLength=k(t.optimalLineLength),this.maximalLineLength=k(t.maximalLineLength),this.minimalLineLength=k(t.minimalLineLength)}static serialize(t){const{...e}=t;return JSON.stringify(e)}static deserialize(t){try{const e=JSON.parse(t);return new zi(e)}catch(e){return console.error("Failed to deserialize preferences:",e),null}}merging(t){const e={...this};for(const i of Object.keys(t))t[i]!==void 0&&(i!=="maximalLineLength"||t[i]===null||t[i]>=(t.optimalLineLength??e.optimalLineLength??65))&&(i!=="minimalLineLength"||t[i]===null||t[i]<=(t.optimalLineLength??e.optimalLineLength??65))&&(e[i]=t[i]);return new zi(e)}};class sh{constructor(t){this.backgroundColor=Y(t.backgroundColor)||null,this.blendFilter=H(t.blendFilter)??!1,this.constraint=k(t.constraint)||0,this.columnCount=k(t.columnCount)||null,this.darkenFilter=Ht(t.darkenFilter)??!1,this.deprecatedFontSize=H(t.deprecatedFontSize),(this.deprecatedFontSize===!1||this.deprecatedFontSize===null)&&(this.deprecatedFontSize=!CSS.supports("zoom","1")),this.fontFamily=Y(t.fontFamily)||null,this.fontSize=It(t.fontSize,Re.range)||1,this.fontSizeNormalize=H(t.fontSizeNormalize)??!1,this.fontOpticalSizing=H(t.fontOpticalSizing)??null,this.fontWeight=It(t.fontWeight,Ce.range)||null,this.fontWidth=It(t.fontWidth,Ee.range)||null,this.hyphens=H(t.hyphens)??null,this.invertFilter=Ht(t.invertFilter)??!1,this.invertGaijiFilter=Ht(t.invertGaijiFilter)??!1,this.iOSPatch=t.iOSPatch===!1?!1:(ht.OS.iOS||ht.OS.iPadOS)&&ht.iOSRequest==="mobile",this.iPadOSPatch=t.iPadOSPatch===!1?!1:ht.OS.iPadOS&&ht.iOSRequest==="desktop",this.letterSpacing=k(t.letterSpacing)||null,this.ligatures=H(t.ligatures)??null,this.lineHeight=k(t.lineHeight)||null,this.linkColor=Y(t.linkColor)||null,this.noRuby=H(t.noRuby)??!1,this.pageGutter=hi(k(t.pageGutter),20),this.paragraphIndent=k(t.paragraphIndent)??null,this.paragraphSpacing=k(t.paragraphSpacing)??null,this.scroll=H(t.scroll)??!1,this.scrollPaddingTop=k(t.scrollPaddingTop)??null,this.scrollPaddingBottom=k(t.scrollPaddingBottom)??null,this.scrollPaddingLeft=k(t.scrollPaddingLeft)??null,this.scrollPaddingRight=k(t.scrollPaddingRight)??null,this.selectionBackgroundColor=Y(t.selectionBackgroundColor)||null,this.selectionTextColor=Y(t.selectionTextColor)||null,this.textAlign=wn(t.textAlign,ee)||null,this.textColor=Y(t.textColor)||null,this.textNormalization=H(t.textNormalization)??!1,this.visitedColor=Y(t.visitedColor)||null,this.wordSpacing=k(t.wordSpacing)||null,this.optimalLineLength=k(t.optimalLineLength)||65,this.maximalLineLength=hi(Pl(t.maximalLineLength,this.optimalLineLength),80),this.minimalLineLength=hi(El(t.minimalLineLength,this.optimalLineLength),40),this.experiments=Fl(t.experiments)||null}}const ah="#FFFFFF",lh="#121212",hh="#0000EE",ch="#551A8B",dh="#b4d8fe",uh="inherit",$t={backgroundColor:ah,textColor:lh,linkColor:hh,visitedColor:ch,selectionBackgroundColor:dh,selectionTextColor:uh};class Dn{constructor(t,e,i){this.preferences=new Fe({...t}),this.settings=e,this.metadata=i,this.layout=this.metadata?.effectiveLayout||w.reflowable}clear(){this.preferences=new Fe({backgroundColor:null,blendFilter:null,columnCount:null,constraint:null,darkenFilter:null,deprecatedFontSize:null,fontFamily:null,fontSize:null,fontSizeNormalize:null,fontOpticalSizing:null,fontWeight:null,fontWidth:null,hyphens:null,invertFilter:null,invertGaijiFilter:null,iOSPatch:null,iPadOSPatch:null,letterSpacing:null,ligatures:null,lineHeight:null,linkColor:null,maximalLineLength:null,minimalLineLength:null,noRuby:null,optimalLineLength:null,pageGutter:null,paragraphIndent:null,paragraphSpacing:null,scroll:null,scrollPaddingTop:null,scrollPaddingBottom:null,scrollPaddingLeft:null,scrollPaddingRight:null,selectionBackgroundColor:null,selectionTextColor:null,textAlign:null,textColor:null,textNormalization:null,visitedColor:null,wordSpacing:null})}updatePreference(t,e){this.preferences[t]=e}get backgroundColor(){return new $({initialValue:this.preferences.backgroundColor,effectiveValue:this.settings.backgroundColor||$t.backgroundColor,isEffective:this.preferences.backgroundColor!==null,onChange:t=>{this.updatePreference("backgroundColor",t??null)}})}get blendFilter(){return new st({initialValue:this.preferences.blendFilter,effectiveValue:this.settings.blendFilter||!1,isEffective:this.preferences.blendFilter!==null,onChange:t=>{this.updatePreference("blendFilter",t??null)}})}get columnCount(){return new $({initialValue:this.preferences.columnCount,effectiveValue:this.settings.columnCount||null,isEffective:this.layout!==w.fixed&&!this.settings.scroll,onChange:t=>{this.updatePreference("columnCount",t??null)}})}get constraint(){return new $({initialValue:this.preferences.constraint,effectiveValue:this.preferences.constraint||0,isEffective:!0,onChange:t=>{this.updatePreference("constraint",t??null)}})}get darkenFilter(){return new q({initialValue:typeof this.preferences.darkenFilter=="boolean"?100:this.preferences.darkenFilter,effectiveValue:typeof this.settings.darkenFilter=="boolean"?100:this.settings.darkenFilter||0,isEffective:this.settings.darkenFilter!==null,onChange:t=>{this.updatePreference("darkenFilter",t??null)},supportedRange:Ut.range,step:Ut.step})}get deprecatedFontSize(){return new st({initialValue:this.preferences.deprecatedFontSize,effectiveValue:CSS.supports("zoom","1")?this.settings.deprecatedFontSize||!1:!0,isEffective:this.layout!==w.fixed,onChange:t=>{this.updatePreference("deprecatedFontSize",t??null)}})}get fontFamily(){return new $({initialValue:this.preferences.fontFamily,effectiveValue:this.settings.fontFamily||null,isEffective:this.layout!==w.fixed,onChange:t=>{this.updatePreference("fontFamily",t??null)}})}get fontSize(){return new q({initialValue:this.preferences.fontSize,effectiveValue:this.settings.fontSize||1,isEffective:this.layout!==w.fixed,onChange:t=>{this.updatePreference("fontSize",t??null)},supportedRange:Re.range,step:Re.step})}get fontSizeNormalize(){return new st({initialValue:this.preferences.fontSizeNormalize,effectiveValue:this.settings.fontSizeNormalize||!1,isEffective:this.layout!==w.fixed&&this.preferences.fontSizeNormalize!==null,onChange:t=>{this.updatePreference("fontSizeNormalize",t??null)}})}get fontOpticalSizing(){return new st({initialValue:this.preferences.fontOpticalSizing,effectiveValue:this.settings.fontOpticalSizing||!0,isEffective:this.layout!==w.fixed&&this.preferences.fontOpticalSizing!==null,onChange:t=>{this.updatePreference("fontOpticalSizing",t??null)}})}get fontWeight(){return new q({initialValue:this.preferences.fontWeight,effectiveValue:this.settings.fontWeight||400,isEffective:this.layout!==w.fixed&&this.preferences.fontWeight!==null,onChange:t=>{this.updatePreference("fontWeight",t??null)},supportedRange:Ce.range,step:Ce.step})}get fontWidth(){return new q({initialValue:this.preferences.fontWidth,effectiveValue:this.settings.fontWidth||100,isEffective:this.layout!==w.fixed&&this.preferences.fontWidth!==null,onChange:t=>{this.updatePreference("fontWidth",t??null)},supportedRange:Ee.range,step:Ee.step})}get hyphens(){return new st({initialValue:this.preferences.hyphens,effectiveValue:this.settings.hyphens||!1,isEffective:this.layout!==w.fixed&&this.metadata?.effectiveReadingProgression===M.ltr&&this.preferences.hyphens!==null,onChange:t=>{this.updatePreference("hyphens",t??null)}})}get invertFilter(){return new q({initialValue:typeof this.preferences.invertFilter=="boolean"?100:this.preferences.invertFilter,effectiveValue:typeof this.settings.invertFilter=="boolean"?100:this.settings.invertFilter||0,isEffective:this.settings.invertFilter!==null,onChange:t=>{this.updatePreference("invertFilter",t??null)},supportedRange:Ut.range,step:Ut.step})}get invertGaijiFilter(){return new q({initialValue:typeof this.preferences.invertGaijiFilter=="boolean"?100:this.preferences.invertGaijiFilter,effectiveValue:typeof this.settings.invertGaijiFilter=="boolean"?100:this.settings.invertGaijiFilter||0,isEffective:this.preferences.invertGaijiFilter!==null,onChange:t=>{this.updatePreference("invertGaijiFilter",t??null)},supportedRange:Ut.range,step:Ut.step})}get iOSPatch(){return new st({initialValue:this.preferences.iOSPatch,effectiveValue:this.settings.iOSPatch||!1,isEffective:this.layout!==w.fixed,onChange:t=>{this.updatePreference("iOSPatch",t??null)}})}get iPadOSPatch(){return new st({initialValue:this.preferences.iPadOSPatch,effectiveValue:this.settings.iPadOSPatch||!1,isEffective:this.layout!==w.fixed,onChange:t=>{this.updatePreference("iPadOSPatch",t??null)}})}get letterSpacing(){return new q({initialValue:this.preferences.letterSpacing,effectiveValue:this.settings.letterSpacing||0,isEffective:this.layout!==w.fixed&&this.preferences.letterSpacing!==null,onChange:t=>{this.updatePreference("letterSpacing",t??null)},supportedRange:fn.range,step:fn.step})}get ligatures(){return new st({initialValue:this.preferences.ligatures,effectiveValue:this.settings.ligatures||!0,isEffective:(()=>{if(this.preferences.ligatures===null||this.layout===w.fixed)return!1;const t=this.metadata?.languages?.[0]?.toLowerCase();return!(t&&["zh","ja","ko","mn-mong"].some(e=>t.startsWith(e)))})(),onChange:t=>{this.updatePreference("ligatures",t??null)}})}get lineHeight(){return new q({initialValue:this.preferences.lineHeight,effectiveValue:this.settings.lineHeight,isEffective:this.layout!==w.fixed&&this.preferences.lineHeight!==null,onChange:t=>{this.updatePreference("lineHeight",t??null)},supportedRange:Sn.range,step:Sn.step})}get linkColor(){return new $({initialValue:this.preferences.linkColor,effectiveValue:this.settings.linkColor||$t.linkColor,isEffective:this.layout!==w.fixed&&this.preferences.linkColor!==null,onChange:t=>{this.updatePreference("linkColor",t??null)}})}get maximalLineLength(){return new q({initialValue:this.preferences.maximalLineLength,effectiveValue:this.settings.maximalLineLength,isEffective:this.layout!==w.fixed,onChange:t=>{this.updatePreference("maximalLineLength",t)},supportedRange:At.range,step:At.step})}get minimalLineLength(){return new q({initialValue:this.preferences.minimalLineLength,effectiveValue:this.settings.minimalLineLength,isEffective:this.layout!==w.fixed,onChange:t=>{this.updatePreference("minimalLineLength",t)},supportedRange:At.range,step:At.step})}get noRuby(){return new st({initialValue:this.preferences.noRuby,effectiveValue:this.settings.noRuby||!1,isEffective:this.layout!==w.fixed&&this.metadata?.languages?.includes("ja")||!1,onChange:t=>{this.updatePreference("noRuby",t??null)}})}get optimalLineLength(){return new q({initialValue:this.preferences.optimalLineLength,effectiveValue:this.settings.optimalLineLength,isEffective:this.layout!==w.fixed,onChange:t=>{this.updatePreference("optimalLineLength",t)},supportedRange:At.range,step:At.step})}get pageGutter(){return new $({initialValue:this.preferences.pageGutter,effectiveValue:this.settings.pageGutter,isEffective:this.layout!==w.fixed&&!this.settings.scroll,onChange:t=>{this.updatePreference("pageGutter",t??null)}})}get paragraphIndent(){return new q({initialValue:this.preferences.paragraphIndent,effectiveValue:this.settings.paragraphIndent||0,isEffective:this.layout!==w.fixed&&this.preferences.paragraphIndent!==null,onChange:t=>{this.updatePreference("paragraphIndent",t??null)},supportedRange:yn.range,step:yn.step})}get paragraphSpacing(){return new q({initialValue:this.preferences.paragraphSpacing,effectiveValue:this.settings.paragraphSpacing||0,isEffective:this.layout!==w.fixed&&this.preferences.paragraphSpacing!==null,onChange:t=>{this.updatePreference("paragraphSpacing",t??null)},supportedRange:_n.range,step:_n.step})}get scroll(){return new st({initialValue:this.preferences.scroll,effectiveValue:this.settings.scroll||!1,isEffective:this.layout!==w.fixed,onChange:t=>{this.updatePreference("scroll",t??null)}})}get scrollPaddingTop(){return new $({initialValue:this.preferences.scrollPaddingTop,effectiveValue:this.settings.scrollPaddingTop||0,isEffective:this.layout!==w.fixed&&!!this.settings.scroll&&this.preferences.scrollPaddingTop!==null,onChange:t=>{this.updatePreference("scrollPaddingTop",t??null)}})}get scrollPaddingBottom(){return new $({initialValue:this.preferences.scrollPaddingBottom,effectiveValue:this.settings.scrollPaddingBottom||0,isEffective:this.layout!==w.fixed&&!!this.settings.scroll&&this.preferences.scrollPaddingBottom!==null,onChange:t=>{this.updatePreference("scrollPaddingBottom",t??null)}})}get scrollPaddingLeft(){return new $({initialValue:this.preferences.scrollPaddingLeft,effectiveValue:this.settings.scrollPaddingLeft||0,isEffective:this.layout!==w.fixed&&!!this.settings.scroll&&this.preferences.scrollPaddingLeft!==null,onChange:t=>{this.updatePreference("scrollPaddingLeft",t??null)}})}get scrollPaddingRight(){return new $({initialValue:this.preferences.scrollPaddingRight,effectiveValue:this.settings.scrollPaddingRight||0,isEffective:this.layout!==w.fixed&&!!this.settings.scroll&&this.preferences.scrollPaddingRight!==null,onChange:t=>{this.updatePreference("scrollPaddingRight",t??null)}})}get selectionBackgroundColor(){return new $({initialValue:this.preferences.selectionBackgroundColor,effectiveValue:this.settings.selectionBackgroundColor||$t.selectionBackgroundColor,isEffective:this.layout!==w.fixed&&this.preferences.selectionBackgroundColor!==null,onChange:t=>{this.updatePreference("selectionBackgroundColor",t??null)}})}get selectionTextColor(){return new $({initialValue:this.preferences.selectionTextColor,effectiveValue:this.settings.selectionTextColor||$t.selectionTextColor,isEffective:this.layout!==w.fixed&&this.preferences.selectionTextColor!==null,onChange:t=>{this.updatePreference("selectionTextColor",t??null)}})}get textAlign(){return new xl({initialValue:this.preferences.textAlign,effectiveValue:this.settings.textAlign||ee.start,isEffective:this.layout!==w.fixed&&this.preferences.textAlign!==null,onChange:t=>{this.updatePreference("textAlign",t??null)},supportedValues:Object.values(ee)})}get textColor(){return new $({initialValue:this.preferences.textColor,effectiveValue:this.settings.textColor||$t.textColor,isEffective:this.layout!==w.fixed&&this.preferences.textColor!==null,onChange:t=>{this.updatePreference("textColor",t??null)}})}get textNormalization(){return new st({initialValue:this.preferences.textNormalization,effectiveValue:this.settings.textNormalization||!1,isEffective:this.layout!==w.fixed,onChange:t=>{this.updatePreference("textNormalization",t??null)}})}get visitedColor(){return new $({initialValue:this.preferences.visitedColor,effectiveValue:this.settings.visitedColor||$t.visitedColor,isEffective:this.layout!==w.fixed&&this.preferences.visitedColor!==null,onChange:t=>{this.updatePreference("visitedColor",t??null)}})}get wordSpacing(){return new q({initialValue:this.preferences.wordSpacing,effectiveValue:this.settings.wordSpacing||0,isEffective:this.layout!==w.fixed&&this.preferences.wordSpacing!==null,onChange:t=>{this.updatePreference("wordSpacing",t??null)},supportedRange:bn.range,step:bn.step})}}function ie(r){const t=getComputedStyle(r),e=parseFloat(t.paddingLeft||"0"),i=parseFloat(t.paddingRight||"0");return r.clientWidth-e-i}function mh(r){const t=getComputedStyle(r),e=parseFloat(t.paddingTop||"0"),i=parseFloat(t.paddingBottom||"0");return r.clientHeight-e-i}let $n=class extends vn{constructor(t){super(),this.a11yNormalize=t.a11yNormalize??null,this.backgroundColor=t.backgroundColor??null,this.blendFilter=t.blendFilter??null,this.bodyHyphens=t.bodyHyphens??null,this.colCount=t.colCount??null,this.darkenFilter=t.darkenFilter??null,this.deprecatedFontSize=t.deprecatedFontSize??null,this.fontFamily=t.fontFamily??null,this.fontOpticalSizing=t.fontOpticalSizing??null,this.fontSize=t.fontSize??null,this.fontSizeNormalize=t.fontSizeNormalize??null,this.fontWeight=t.fontWeight??null,this.fontWidth=t.fontWidth??null,this.invertFilter=t.invertFilter??null,this.invertGaijiFilter=t.invertGaijiFilter??null,this.iOSPatch=t.iOSPatch??null,this.iPadOSPatch=t.iPadOSPatch??null,this.letterSpacing=t.letterSpacing??null,this.ligatures=t.ligatures??null,this.lineHeight=t.lineHeight??null,this.lineLength=t.lineLength??null,this.linkColor=t.linkColor??null,this.noRuby=t.noRuby??null,this.paraIndent=t.paraIndent??null,this.paraSpacing=t.paraSpacing??null,this.selectionBackgroundColor=t.selectionBackgroundColor??null,this.selectionTextColor=t.selectionTextColor??null,this.textAlign=t.textAlign??null,this.textColor=t.textColor??null,this.view=t.view??null,this.visitedColor=t.visitedColor??null,this.wordSpacing=t.wordSpacing??null}toCSSProperties(){const t={};return this.a11yNormalize&&(t["--USER__a11yNormalize"]=this.toFlag("a11y")),this.backgroundColor&&(t["--USER__backgroundColor"]=this.backgroundColor),this.blendFilter&&(t["--USER__blendFilter"]=this.toFlag("blend")),this.bodyHyphens&&(t["--USER__bodyHyphens"]=this.bodyHyphens),this.colCount&&(t["--USER__colCount"]=this.toUnitless(this.colCount)),this.darkenFilter===!0?t["--USER__darkenFilter"]=this.toFlag("darken"):typeof this.darkenFilter=="number"&&(t["--USER__darkenFilter"]=this.toPercentage(this.darkenFilter)),this.deprecatedFontSize&&(t["--USER__fontSizeImplementation"]=this.toFlag("deprecatedFontSize")),this.fontFamily&&(t["--USER__fontFamily"]=this.fontFamily),this.fontOpticalSizing!=null&&(t["--USER__fontOpticalSizing"]=this.fontOpticalSizing),this.fontSize!=null&&(t["--USER__fontSize"]=this.toPercentage(this.fontSize,!0)),this.fontSizeNormalize&&(t["--USER__fontSizeNormalize"]=this.toFlag("normalize")),this.fontWeight!=null&&(t["--USER__fontWeight"]=this.toUnitless(this.fontWeight)),this.fontWidth!=null&&(t["--USER__fontWidth"]=typeof this.fontWidth=="string"?this.fontWidth:this.toUnitless(this.fontWidth)),this.invertFilter===!0?t["--USER__invertFilter"]=this.toFlag("invert"):typeof this.invertFilter=="number"&&(t["--USER__invertFilter"]=this.toPercentage(this.invertFilter)),this.invertGaijiFilter===!0?t["--USER__invertGaiji"]=this.toFlag("invertGaiji"):typeof this.invertGaijiFilter=="number"&&(t["--USER__invertGaiji"]=this.toPercentage(this.invertGaijiFilter)),this.iOSPatch&&(t["--USER__iOSPatch"]=this.toFlag("iOSPatch")),this.iPadOSPatch&&(t["--USER__iPadOSPatch"]=this.toFlag("iPadOSPatch")),this.letterSpacing!=null&&(t["--USER__letterSpacing"]=this.toRem(this.letterSpacing)),this.ligatures&&(t["--USER__ligatures"]=this.ligatures),this.lineHeight!=null&&(t["--USER__lineHeight"]=this.toUnitless(this.lineHeight)),this.lineLength!=null&&(t["--USER__lineLength"]=this.toPx(this.lineLength)),this.linkColor&&(t["--USER__linkColor"]=this.linkColor),this.noRuby&&(t["--USER__noRuby"]=this.toFlag("noRuby")),this.paraIndent!=null&&(t["--USER__paraIndent"]=this.toRem(this.paraIndent)),this.paraSpacing!=null&&(t["--USER__paraSpacing"]=this.toRem(this.paraSpacing)),this.selectionBackgroundColor&&(t["--USER__selectionBackgroundColor"]=this.selectionBackgroundColor),this.selectionTextColor&&(t["--USER__selectionTextColor"]=this.selectionTextColor),this.textAlign&&(t["--USER__textAlign"]=this.textAlign),this.textColor&&(t["--USER__textColor"]=this.textColor),this.view&&(t["--USER__view"]=this.toFlag(this.view)),this.visitedColor&&(t["--USER__visitedColor"]=this.visitedColor),this.wordSpacing!=null&&(t["--USER__wordSpacing"]=this.toRem(this.wordSpacing)),t}},ph=class extends vn{constructor(t){super(),this.backgroundColor=t.backgroundColor??null,this.baseFontFamily=t.baseFontFamily??null,this.baseFontSize=t.baseFontSize??null,this.baseLineHeight=t.baseLineHeight??null,this.boxSizingMedia=t.boxSizingMedia??null,this.boxSizingTable=t.boxSizingTable??null,this.colWidth=t.colWidth??null,this.colCount=t.colCount??null,this.colGap=t.colGap??null,this.codeFontFamily=t.codeFontFamily??null,this.compFontFamily=t.compFontFamily??null,this.defaultLineLength=t.defaultLineLength??null,this.flowSpacing=t.flowSpacing??null,this.humanistTf=t.humanistTf??null,this.linkColor=t.linkColor??null,this.maxMediaWidth=t.maxMediaWidth??null,this.maxMediaHeight=t.maxMediaHeight??null,this.modernTf=t.modernTf??null,this.monospaceTf=t.monospaceTf??null,this.noOverflow=t.noOverflow??null,this.noVerticalPagination=t.noVerticalPagination??null,this.oldStyleTf=t.oldStyleTf??null,this.pageGutter=t.pageGutter??null,this.paraIndent=t.paraIndent??null,this.paraSpacing=t.paraSpacing??null,this.primaryColor=t.primaryColor??null,this.scrollPaddingBottom=t.scrollPaddingBottom??null,this.scrollPaddingLeft=t.scrollPaddingLeft??null,this.scrollPaddingRight=t.scrollPaddingRight??null,this.scrollPaddingTop=t.scrollPaddingTop??null,this.sansSerifJa=t.sansSerifJa??null,this.sansSerifJaV=t.sansSerifJaV??null,this.sansTf=t.sansTf??null,this.secondaryColor=t.secondaryColor??null,this.selectionBackgroundColor=t.selectionBackgroundColor??null,this.selectionTextColor=t.selectionTextColor??null,this.serifJa=t.serifJa??null,this.serifJaV=t.serifJaV??null,this.textColor=t.textColor??null,this.typeScale=t.typeScale??null,this.visitedColor=t.visitedColor??null,this.experiments=t.experiments??null}toCSSProperties(){const t={};return this.backgroundColor&&(t["--RS__backgroundColor"]=this.backgroundColor),this.baseFontFamily&&(t["--RS__baseFontFamily"]=this.baseFontFamily),this.baseFontSize!=null&&(t["--RS__baseFontSize"]=this.toRem(this.baseFontSize)),this.baseLineHeight!=null&&(t["--RS__baseLineHeight"]=this.toUnitless(this.baseLineHeight)),this.boxSizingMedia&&(t["--RS__boxSizingMedia"]=this.boxSizingMedia),this.boxSizingTable&&(t["--RS__boxSizingTable"]=this.boxSizingTable),this.colWidth!=null&&(t["--RS__colWidth"]=this.colWidth),this.colCount!=null&&(t["--RS__colCount"]=this.toUnitless(this.colCount)),this.colGap!=null&&(t["--RS__colGap"]=this.toPx(this.colGap)),this.codeFontFamily&&(t["--RS__codeFontFamily"]=this.codeFontFamily),this.compFontFamily&&(t["--RS__compFontFamily"]=this.compFontFamily),this.defaultLineLength!=null&&(t["--RS__defaultLineLength"]=this.toPx(this.defaultLineLength)),this.flowSpacing!=null&&(t["--RS__flowSpacing"]=this.toRem(this.flowSpacing)),this.humanistTf&&(t["--RS__humanistTf"]=this.humanistTf),this.linkColor&&(t["--RS__linkColor"]=this.linkColor),this.maxMediaWidth&&(t["--RS__maxMediaWidth"]=this.toVw(this.maxMediaWidth)),this.maxMediaHeight&&(t["--RS__maxMediaHeight"]=this.toVh(this.maxMediaHeight)),this.modernTf&&(t["--RS__modernTf"]=this.modernTf),this.monospaceTf&&(t["--RS__monospaceTf"]=this.monospaceTf),this.noOverflow&&(t["--RS__disableOverflow"]=this.toFlag("noOverflow")),this.noVerticalPagination&&(t["--RS__disablePagination"]=this.toFlag("noVerticalPagination")),this.oldStyleTf&&(t["--RS__oldStyleTf"]=this.oldStyleTf),this.pageGutter!=null&&(t["--RS__pageGutter"]=this.toPx(this.pageGutter)),this.paraIndent!=null&&(t["--RS__paraIndent"]=this.toRem(this.paraIndent)),this.paraSpacing!=null&&(t["--RS__paraSpacing"]=this.toRem(this.paraSpacing)),this.primaryColor&&(t["--RS__primaryColor"]=this.primaryColor),this.sansSerifJa&&(t["--RS__sans-serif-ja"]=this.sansSerifJa),this.sansSerifJaV&&(t["--RS__sans-serif-ja-v"]=this.sansSerifJaV),this.sansTf&&(t["--RS__sansTf"]=this.sansTf),this.scrollPaddingBottom!=null&&(t["--RS__scrollPaddingBottom"]=this.toPx(this.scrollPaddingBottom)),this.scrollPaddingLeft!=null&&(t["--RS__scrollPaddingLeft"]=this.toPx(this.scrollPaddingLeft)),this.scrollPaddingRight!=null&&(t["--RS__scrollPaddingRight"]=this.toPx(this.scrollPaddingRight)),this.scrollPaddingTop!=null&&(t["--RS__scrollPaddingTop"]=this.toPx(this.scrollPaddingTop)),this.secondaryColor&&(t["--RS__secondaryColor"]=this.secondaryColor),this.selectionBackgroundColor&&(t["--RS__selectionBackgroundColor"]=this.selectionBackgroundColor),this.selectionTextColor&&(t["--RS__selectionTextColor"]=this.selectionTextColor),this.serifJa&&(t["--RS__serif-ja"]=this.serifJa),this.serifJaV&&(t["--RS__serif-ja-v"]=this.serifJaV),this.textColor&&(t["--RS__textColor"]=this.textColor),this.typeScale&&(t["--RS__typeScale"]=this.toUnitless(this.typeScale)),this.visitedColor&&(t["--RS__visitedColor"]=this.visitedColor),this.experiments&&this.experiments.forEach(e=>{t["--RS__"+e]=gn[e].value}),t}};class gh{constructor(t){this.rsProperties=t.rsProperties,this.userProperties=t.userProperties,this.lineLengths=t.lineLengths,this.container=t.container,this.containerParent=t.container.parentElement||document.documentElement,this.constraint=t.constraint,this.isCJKVertical=t.isCJKVertical??!1,this.cachedColCount=t.userProperties.colCount,this.effectiveContainerWidth=ie(this.containerParent)}update(t){this.cachedColCount=t.columnCount,t.constraint!==this.constraint&&(this.constraint=t.constraint),t.pageGutter!==this.rsProperties.pageGutter&&(this.rsProperties.pageGutter=t.pageGutter),t.scrollPaddingBottom!==this.rsProperties.scrollPaddingBottom&&(this.rsProperties.scrollPaddingBottom=t.scrollPaddingBottom),t.scrollPaddingLeft!==this.rsProperties.scrollPaddingLeft&&(this.rsProperties.scrollPaddingLeft=t.scrollPaddingLeft),t.scrollPaddingRight!==this.rsProperties.scrollPaddingRight&&(this.rsProperties.scrollPaddingRight=t.scrollPaddingRight),t.scrollPaddingTop!==this.rsProperties.scrollPaddingTop&&(this.rsProperties.scrollPaddingTop=t.scrollPaddingTop),t.experiments!==this.rsProperties.experiments&&(this.rsProperties.experiments=t.experiments),this.lineLengths.update({fontFace:t.fontFamily,letterSpacing:t.letterSpacing,padding:t.scroll?(t.scrollPaddingLeft||0)+(t.scrollPaddingRight||0):(t.pageGutter||0)*2,wordSpacing:t.wordSpacing,optimalChars:t.optimalLineLength,minChars:t.minimalLineLength,maxChars:t.maximalLineLength});const e=this.updateLayout(t.fontSize,t.deprecatedFontSize||t.iOSPatch,t.scroll,t.columnCount);e?.effectiveContainerWidth&&(this.effectiveContainerWidth=e?.effectiveContainerWidth);const i={a11yNormalize:t.textNormalization,backgroundColor:t.backgroundColor,blendFilter:t.blendFilter,bodyHyphens:typeof t.hyphens!="boolean"?null:t.hyphens?"auto":"none",colCount:e?.colCount,darkenFilter:t.darkenFilter,deprecatedFontSize:t.deprecatedFontSize,fontFamily:t.fontFamily,fontOpticalSizing:typeof t.fontOpticalSizing!="boolean"?null:t.fontOpticalSizing?"auto":"none",fontSize:t.fontSize,fontSizeNormalize:t.fontSizeNormalize,fontWeight:t.fontWeight,fontWidth:t.fontWidth,invertFilter:t.invertFilter,invertGaijiFilter:t.invertGaijiFilter,iOSPatch:t.iOSPatch,iPadOSPatch:t.iPadOSPatch,letterSpacing:t.letterSpacing,ligatures:typeof t.ligatures!="boolean"?null:t.ligatures?"common-ligatures":"none",lineHeight:t.lineHeight,lineLength:e?.effectiveLineLength,linkColor:t.linkColor,noRuby:t.noRuby,paraIndent:t.paragraphIndent,paraSpacing:t.paragraphSpacing,selectionBackgroundColor:t.selectionBackgroundColor,selectionTextColor:t.selectionTextColor,textAlign:t.textAlign,textColor:t.textColor,view:typeof t.scroll!="boolean"?null:t.scroll?"scroll":"paged",visitedColor:t.visitedColor,wordSpacing:t.wordSpacing};this.userProperties=new $n(i)}updateLayout(t,e,i,o){return this.isCJKVertical?this.computeCJKVerticalLength(t,e):i??this.userProperties.view==="scroll"?this.computeScrollLength(t,e):this.paginate(t,e,o)}getCompensatedMetrics(t,e){const i=t||this.userProperties.fontSize||1,o=i<1?1/i:e?i:1;return{zoomFactor:i,zoomCompensation:o,optimal:Math.round(this.lineLengths.optimalLineLength)*i,minimal:this.lineLengths.minimalLineLength!==null?Math.round(this.lineLengths.minimalLineLength*i):null,maximal:this.lineLengths.maximalLineLength!==null?Math.round(this.lineLengths.maximalLineLength*i):null}}paginate(t,e,i){const o=Math.round(ie(this.containerParent)-this.constraint),n=this.getCompensatedMetrics(t,e),{zoomCompensation:s,optimal:a,minimal:h,maximal:l}=n,c=()=>o>=a&&l!==null?Math.min(Math.round(l*s),o):o;let d=1,u=o;if(i===void 0)return{colCount:void 0,effectiveContainerWidth:u,effectiveLineLength:Math.round(u/d*s)};if(i===null)if(o>=a&&l!==null){d=Math.floor(o/a);const m=Math.round(d*(l*s));u=Math.min(m,o)}else u=c();else if(i>1){const m=Math.round(i*(h!==null?h:a));if(o>=m)if(d=i,l===null)u=o;else{const p=Math.round(d*(l*s));u=Math.min(p,o)}else if(h!==null&&o<Math.round(i*h))if(d=Math.floor(o/h),d<=1)d=1,u=c();else{const p=Math.round(d*(a*s));u=Math.min(p,o)}else{d=i;const p=Math.round(d*(a*s));u=Math.min(p,o)}}else d=1,u=c();return{colCount:d,effectiveContainerWidth:u,effectiveLineLength:Math.round(u/d/(t&&t>=1?t:1)*s)}}computeCJKVerticalLength(t,e){const i=Math.round(ie(this.containerParent)-this.constraint),o=Math.round(mh(this.containerParent)),n=this.getCompensatedMetrics(t,e),s=n.maximal!==null?Math.min(Math.round(n.maximal*n.zoomCompensation),o):o;return{colCount:void 0,effectiveContainerWidth:i,effectiveLineLength:s}}computeScrollLength(t,e){const i=Math.round(ie(this.containerParent)-this.constraint),o=this.getCompensatedMetrics(t&&(t<1||e)?t:1,e),n=o.zoomCompensation,s=o.optimal,a=o.maximal;let h,l=i,c=Math.round(s*n);if(a===null)c=i;else{const d=Math.min(Math.round(a*n),i);c=e?d:Math.round(d*n)}return{colCount:h,effectiveContainerWidth:l,effectiveLineLength:c}}setContainerWidth(){this.container.style.width=`${this.effectiveContainerWidth}px`}resizeHandler(){const t=this.updateLayout(this.userProperties.fontSize,this.userProperties.deprecatedFontSize||this.userProperties.iOSPatch,this.userProperties.view==="scroll",this.cachedColCount);this.userProperties.colCount=t.colCount,this.userProperties.lineLength=t.effectiveLineLength,this.effectiveContainerWidth=t.effectiveContainerWidth,this.container.style.width=`${this.effectiveContainerWidth}px`}}const fh="modulepreload",Sh=function(r){return"/"+r},Wn={},et=function(r,t,e){let i=Promise.resolve();if(t&&t.length>0){let n=function(h){return Promise.all(h.map(l=>Promise.resolve(l).then(c=>({status:"fulfilled",value:c}),c=>({status:"rejected",reason:c}))))};document.getElementsByTagName("link");const s=document.querySelector("meta[property=csp-nonce]"),a=s?.nonce||s?.getAttribute("nonce");i=n(t.map(h=>{if(h=Sh(h),h in Wn)return;Wn[h]=!0;const l=h.endsWith(".css"),c=l?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${h}"]${c}`))return;const d=document.createElement("link");if(d.rel=l?"stylesheet":fh,l||(d.as="script"),d.crossOrigin="",d.href=h,a&&d.setAttribute("nonce",a),document.head.appendChild(d),l)return new Promise((u,m)=>{d.addEventListener("load",u),d.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${h}`)))})}))}function o(n){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=n,window.dispatchEvent(s),!s.defaultPrevented)throw n}return i.then(n=>{for(const s of n||[])s.status==="rejected"&&o(s.reason);return r().catch(o)})},yh=`// Note: we aren't blocking some of the events right now to try and be as nonintrusive as possible.
// For a more comprehensive implementation, see https://github.com/hackademix/noscript/blob/3a83c0e4a506f175e38b0342dad50cdca3eae836/src/content/syncFetchPolicy.js#L142
// The snippet of code at the beginning of this source is an attempt at defence against JS using persistent storage
(function() {
    const noop = () => {}, emptyObj = {}, emptyPromise = () => Promise.resolve(void 0), fakeStorage = {
        getItem: noop, 
        setItem: noop, 
        removeItem: noop, 
        clear: noop, 
        key: noop, 
        length: 0
    };
    
    ["localStorage", "sessionStorage"].forEach((e) => Object.defineProperty(window, e, {
        get: () => fakeStorage,
        configurable: !0
    }));
    
    Object.defineProperty(document, "cookie", {
        get: () => "",
        set: noop,
        configurable: !0
    });
    
    Object.defineProperty(window, "indexedDB", {
        get: () => {},
        configurable: !0
    });
    
    Object.defineProperty(window, "caches", {
        get: () => emptyObj,
        configurable: !0
    });
    
    Object.defineProperty(navigator, "storage", {
        get: () => ({
            persist: emptyPromise,
            persisted: emptyPromise,
            estimate: () => Promise.resolve({quota: 0, usage: 0})
        }),
        configurable: !0
    });
    
    Object.defineProperty(navigator, "serviceWorker", {
        get: () => ({
            register: emptyPromise,
            getRegistration: emptyPromise,
            ready: emptyPromise()
        }),
        configurable: !0
    });

    window._readium_blockedEvents = [];
    window._readium_blockEvents = true;
    window._readium_eventBlocker = (e) => {
        if(!window._readium_blockEvents) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        _readium_blockedEvents.push([
            1, e, e.currentTarget || e.target
        ]);
    };
    window.addEventListener("DOMContentLoaded", window._readium_eventBlocker, true);
    window.addEventListener("load", window._readium_eventBlocker, true);
})();
`;async function _h(r,t){const e=r.effectiveLayout===w.fixed,i=t.filter(a=>a.mediaType.isHTML).map(a=>a.href),o=i.length>0?i:[/\.xhtml$/,/\.html$/],n=[{id:"css-selector-generator",as:"script",target:"head",blob:new Blob([ci(Tl)],{type:"text/javascript"})},{id:"execution-prevention",as:"script",target:"head",blob:new Blob([ci(yh)],{type:"text/javascript"}),condition:a=>!!(a.querySelector("script")||a.querySelector("body[onload]:not(body[onload=''])"))}],s=[{id:"onload-proxy",as:"script",target:"head",blob:new Blob([ci(Ol)],{type:"text/javascript"}),condition:a=>!!(a.querySelector("script")||a.querySelector("body[onload]:not(body[onload=''])"))}];if(!e){const a=te(r);let h,l,c;switch(a){case"rtl":{const[d,u,m]=await Promise.all([et(()=>Promise.resolve().then(()=>Fh),[]),et(()=>Promise.resolve().then(()=>xh),[]),et(()=>Promise.resolve().then(()=>kh),[])]);h=d.default,l=u.default,c=m.default;break}case"cjk-horizontal":{const[d,u,m]=await Promise.all([et(()=>Promise.resolve().then(()=>zh),[]),et(()=>Promise.resolve().then(()=>Th),[]),et(()=>Promise.resolve().then(()=>Oh),[])]);h=d.default,l=u.default,c=m.default;break}case"cjk-vertical":case"mongolian-vertical":{const[d,u,m]=await Promise.all([et(()=>Promise.resolve().then(()=>Mh),[]),et(()=>Promise.resolve().then(()=>Nh),[]),et(()=>Promise.resolve().then(()=>Lh),[])]);h=d.default,l=u.default,c=m.default;break}default:{const[d,u,m]=await Promise.all([et(()=>Promise.resolve().then(()=>Uh),[]),et(()=>Promise.resolve().then(()=>Ah),[]),et(()=>Promise.resolve().then(()=>Hh),[])]);h=d.default,l=u.default,c=m.default;break}}if(n.unshift({id:"readium-css-before",as:"link",target:"head",blob:new Blob([Pe(h)],{type:"text/css"}),rel:"stylesheet"}),s.unshift({id:"readium-css-default",as:"link",target:"head",blob:new Blob([Pe(l)],{type:"text/css"}),rel:"stylesheet",condition:d=>!(d.querySelector("link[rel='stylesheet']")||d.querySelector("style")||d.querySelector("[style]:not([style=''])"))},{id:"readium-css-after",as:"link",target:"head",blob:new Blob([Pe(c)],{type:"text/css"}),rel:"stylesheet"}),(a==="cjk-horizontal"||a==="cjk-vertical")&&(r.description==="ebpaj-guide-1.0"||r.otherMetadata?.["ebpaj:guide-version"]!==void 0)){const{default:d}=await et(async()=>{const{default:u}=await Promise.resolve().then(()=>Ih);return{default:u}},[]);s.push({id:"readium-css-ebpaj",as:"link",target:"head",blob:new Blob([Pe(d)],{type:"text/css"}),rel:"stylesheet"})}}return[{resources:o,prepend:n,append:s}]}let Bn=class{constructor(t,e){this.backgroundColor=t.backgroundColor||e.backgroundColor||null,this.blendFilter=typeof t.blendFilter=="boolean"?t.blendFilter:e.blendFilter??null,this.columnCount=t.columnCount!==void 0?t.columnCount:e.columnCount!==void 0?e.columnCount:null,this.constraint=t.constraint||e.constraint,this.darkenFilter=typeof t.darkenFilter=="boolean"?t.darkenFilter:e.darkenFilter??null,this.deprecatedFontSize=typeof t.deprecatedFontSize=="boolean"?t.deprecatedFontSize:e.deprecatedFontSize??null,this.fontFamily=t.fontFamily||e.fontFamily||null,this.fontSize=t.fontSize!==void 0?t.fontSize:e.fontSize!==void 0?e.fontSize:null,this.fontSizeNormalize=typeof t.fontSizeNormalize=="boolean"?t.fontSizeNormalize:e.fontSizeNormalize??null,this.fontOpticalSizing=typeof t.fontOpticalSizing=="boolean"?t.fontOpticalSizing:e.fontOpticalSizing??null,this.fontWeight=t.fontWeight!==void 0?t.fontWeight:e.fontWeight!==void 0?e.fontWeight:null,this.fontWidth=t.fontWidth!==void 0?t.fontWidth:e.fontWidth!==void 0?e.fontWidth:null,this.hyphens=typeof t.hyphens=="boolean"?t.hyphens:e.hyphens??null,this.invertFilter=typeof t.invertFilter=="boolean"?t.invertFilter:e.invertFilter??null,this.invertGaijiFilter=typeof t.invertGaijiFilter=="boolean"?t.invertGaijiFilter:e.invertGaijiFilter??null,this.iOSPatch=this.deprecatedFontSize||t.iOSPatch===!1?!1:t.iOSPatch===!0?(ht.OS.iOS||ht.OS.iPadOS)&&ht.iOSRequest==="mobile":e.iOSPatch,this.iPadOSPatch=this.deprecatedFontSize||t.iPadOSPatch===!1?!1:t.iPadOSPatch===!0?ht.OS.iPadOS&&ht.iOSRequest==="desktop":e.iPadOSPatch,this.letterSpacing=t.letterSpacing!==void 0?t.letterSpacing:e.letterSpacing!==void 0?e.letterSpacing:null,this.ligatures=typeof t.ligatures=="boolean"?t.ligatures:e.ligatures??null,this.lineHeight=t.lineHeight!==void 0?t.lineHeight:e.lineHeight!==void 0?e.lineHeight:null,this.linkColor=t.linkColor||e.linkColor||null,this.maximalLineLength=t.maximalLineLength===null?null:t.maximalLineLength||e.maximalLineLength||null,this.minimalLineLength=t.minimalLineLength===null?null:t.minimalLineLength||e.minimalLineLength||null,this.noRuby=typeof t.noRuby=="boolean"?t.noRuby:e.noRuby??null,this.optimalLineLength=t.optimalLineLength||e.optimalLineLength,this.pageGutter=t.pageGutter!==void 0?t.pageGutter:e.pageGutter!==void 0?e.pageGutter:null,this.paragraphIndent=t.paragraphIndent!==void 0?t.paragraphIndent:e.paragraphIndent!==void 0?e.paragraphIndent:null,this.paragraphSpacing=t.paragraphSpacing!==void 0?t.paragraphSpacing:e.paragraphSpacing!==void 0?e.paragraphSpacing:null,this.scroll=typeof t.scroll=="boolean"?t.scroll:e.scroll??null,this.scrollPaddingTop=t.scrollPaddingTop!==void 0?t.scrollPaddingTop:e.scrollPaddingTop!==void 0?e.scrollPaddingTop:null,this.scrollPaddingBottom=t.scrollPaddingBottom!==void 0?t.scrollPaddingBottom:e.scrollPaddingBottom!==void 0?e.scrollPaddingBottom:null,this.scrollPaddingLeft=t.scrollPaddingLeft!==void 0?t.scrollPaddingLeft:e.scrollPaddingLeft!==void 0?e.scrollPaddingLeft:null,this.scrollPaddingRight=t.scrollPaddingRight!==void 0?t.scrollPaddingRight:e.scrollPaddingRight!==void 0?e.scrollPaddingRight:null,this.selectionBackgroundColor=t.selectionBackgroundColor||e.selectionBackgroundColor||null,this.selectionTextColor=t.selectionTextColor||e.selectionTextColor||null,this.textAlign=t.textAlign||e.textAlign||null,this.textColor=t.textColor||e.textColor||null,this.textNormalization=typeof t.textNormalization=="boolean"?t.textNormalization:e.textNormalization??null,this.visitedColor=t.visitedColor||e.visitedColor||null,this.wordSpacing=t.wordSpacing!==void 0?t.wordSpacing:e.wordSpacing!==void 0?e.wordSpacing:null,this.experiments=e.experiments||null}};const bh="'Iowan Old Style', Sitka, 'Sitka Text', Palatino, 'Book Antiqua', 'URW Palladio L', P052, serif",vh={oldStyleTf:bh},wh=16,jn=vh.oldStyleTf;class oe{constructor(t){this._optimalLineLength=null,this._canvas=document.createElement("canvas"),this._optimalChars=t.optimalChars,this._minChars=t.minChars,this._maxChars=t.maxChars,this._baseFontSize=t.baseFontSize||wh,this._fontFace=t.fontFace||jn,this._sample=t.sample||null,this._padding=t.padding??0,this._letterSpacing=t.letterSpacing?Math.round(t.letterSpacing*this._baseFontSize):0,this._wordSpacing=t.wordSpacing?Math.round(t.wordSpacing*this._baseFontSize):0,this._isCJK=t.isCJK||!1,this._getRelative=t.getRelative||!1,this._minDivider=this._minChars&&this._minChars<this._optimalChars?this._optimalChars/this._minChars:this._minChars===null?null:1,this._maxMultiplier=this._maxChars&&this._maxChars>this._optimalChars?this._maxChars/this._optimalChars:this._maxChars===null?null:1,this._approximatedWordSpaces=oe.approximateWordSpaces(this._optimalChars,this._sample)}updateMultipliers(){this._minDivider=this._minChars&&this._minChars<this._optimalChars?this._optimalChars/this._minChars:this._minChars===null?null:1,this._maxMultiplier=this._maxChars&&this._maxChars>this._optimalChars?this._maxChars/this._optimalChars:this._maxChars===null?null:1}update(t){t.optimalChars&&(this._optimalChars=t.optimalChars),t.minChars!==void 0&&(this._minChars=t.minChars),t.maxChars!==void 0&&(this._maxChars=t.maxChars),t.baseFontSize&&(this._baseFontSize=t.baseFontSize),t.fontFace!==void 0&&(this._fontFace=t.fontFace||jn),t.letterSpacing&&(this._letterSpacing=t.letterSpacing),t.wordSpacing&&(this._wordSpacing=t.wordSpacing),t.isCJK!=null&&(this._isCJK=t.isCJK),t.padding!==void 0&&(this._padding=t.padding??0),t.getRelative&&(this._getRelative=t.getRelative),t.sample&&(this._sample=t.sample,this._approximatedWordSpaces=oe.approximateWordSpaces(this._optimalChars,this._sample)),this.updateMultipliers(),this._optimalLineLength=this.getOptimalLineLength()}get baseFontSize(){return this._baseFontSize}get minimalLineLength(){return this._optimalLineLength||(this._optimalLineLength=this.getOptimalLineLength()),this._minDivider!==null?Math.round(this._optimalLineLength/this._minDivider+this._padding)/(this._getRelative?this._baseFontSize:1):null}get maximalLineLength(){return this._optimalLineLength||(this._optimalLineLength=this.getOptimalLineLength()),this._maxMultiplier!==null?Math.round(this._optimalLineLength*this._maxMultiplier+this._padding)/(this._getRelative?this._baseFontSize:1):null}get optimalLineLength(){return this._optimalLineLength||(this._optimalLineLength=this.getOptimalLineLength()),Math.round(this._optimalLineLength+this._padding)/(this._getRelative?this._baseFontSize:1)}get all(){return this._optimalLineLength||(this._optimalLineLength=this.getOptimalLineLength()),{min:this.minimalLineLength,max:this.maximalLineLength,optimal:this.optimalLineLength,baseFontSize:this._baseFontSize}}static approximateWordSpaces(t,e){let i=0;if(e&&e.length>=t){const o=e.match(/([\s]+)/gi);i=(o?o.length:0)*(t/e.length)}return i}getLineLengthFallback(){const t=this._letterSpacing*(this._optimalChars-1),e=this._wordSpacing*this._approximatedWordSpaces;return this._optimalChars*(this._baseFontSize*.5)+t+e}getOptimalLineLength(){if(this._fontFace){if(typeof this._fontFace=="string")return this.measureText(this._fontFace);{const t=new FontFace(this._fontFace.name,`url(${this._fontFace.url})`);t.load().then(()=>(document.fonts.add(t),this.measureText(t.family)),e=>{})}}return this.getLineLengthFallback()}measureText(t){const e=this._canvas.getContext("2d");if(e&&t){let i=this._isCJK?"水".repeat(this._optimalChars):"0".repeat(this._optimalChars);if(e.font=`${this._baseFontSize}px ${t}`,this._sample&&this._sample.length>=this._optimalChars&&(i=this._sample.slice(0,this._optimalChars)),Object.hasOwn(e,"letterSpacing")&&Object.hasOwn(e,"wordSpacing"))return e.letterSpacing=this._letterSpacing.toString()+"px",e.wordSpacing=this._wordSpacing.toString()+"px",e.measureText(i).width;{const o=this._letterSpacing*(this._optimalChars-1),n=this._wordSpacing*oe.approximateWordSpaces(this._optimalChars,this._sample);return e.measureText(i).width+o+n}}else return this.getLineLengthFallback()}}const Rh=1e3,Ch="https://navigator.invalid/",Eh=r=>({frameLoaded:r.frameLoaded||(()=>{}),positionChanged:r.positionChanged||(()=>{}),viewportChanged:r.viewportChanged||(()=>{}),timelineItemChanged:r.timelineItemChanged||(()=>{}),tap:r.tap||(()=>!1),click:r.click||(()=>!1),zoom:r.zoom||(()=>{}),miscPointer:r.miscPointer||(()=>{}),scroll:r.scroll||(()=>{}),customEvent:r.customEvent||(()=>{}),handleLocator:r.handleLocator||(()=>!1),textSelected:r.textSelected||(()=>{}),contentProtection:r.contentProtection||(()=>{}),contextMenu:r.contextMenu||(()=>{}),peripheral:r.peripheral||(()=>{})});function Ph(r,t){return r.length===t.length&&r.every((e,i)=>e===t[i])}class Si extends Sl{constructor(t,e,i,o=[],n=void 0,s={preferences:{},defaults:{}}){super(),this._destroyed=!1,this._visibleFragmentIds=[],this._notifiedVisibleFragmentIds=[],this._timelineAugmented=!1,this._preferencesEditor=null,this._injector=null,this._isNavigating=!1,this._navigatorProtector=null,this._keyboardPeripheralsManager=null,this._suspiciousActivityListener=null,this._keyboardPeripheralListener=null,this._decorations=new Map,this._decorationObservers=new Map,this._decorationHoveredDecorations=new Map,this._decorationActivationState=new Map,this._decorationHoverState=new Map,this._decorationActivationConsumed=!1,this._navigationLocked=!1,this._pointedPieceRequests=new Map,this._pointedPieceRequestId=0,this.reflowViewport={readingOrder:[],progressions:new Map,positions:null},this.pub=e,this.container=t,this.listeners=Eh(i),this.currentLocation=n,o.length&&(this.positions=o),this._preferences=new Fe(s.preferences),this._defaults=new sh(s.defaults),this._settings=new Bn(this._preferences,this._defaults);const a=te(e.metadata),h=a==="cjk-horizontal",l=a==="cjk-vertical",c=l||a==="mongolian-vertical",d=h||l;this._css=new gh({rsProperties:new ph({noVerticalPagination:c||void 0}),userProperties:new $n({}),lineLengths:new oe({optimalChars:this._settings.optimalLineLength,minChars:this._settings.minimalLineLength,maxChars:this._settings.maximalLineLength,padding:this._settings.scroll?(this._settings.scrollPaddingLeft||0)+(this._settings.scrollPaddingRight||0):(this._settings.pageGutter||0)*2,fontFace:this._settings.fontFamily,letterSpacing:this._settings.letterSpacing,wordSpacing:this._settings.wordSpacing,isCJK:d}),container:t,constraint:this._settings.constraint,isCJKVertical:c}),this._layout=Si.determineLayout(e,!!this._settings.scroll),this.currentProgression=e.metadata.effectiveReadingProgression,this._injectablesConfig=s.injectables||{rules:[],allowedDomains:[]},this._readiumRulesPromise=_h(e.metadata,e.readingOrder.items),this._contentProtection=s.contentProtection||{},this._decoratorConfig=s.decoratorConfig||{},this._decorationResizeSelectors=new Set(this._decoratorConfig.resizeWatchSelectors??[]),this._upgradeInsecureRequests=s.upgradeInsecureRequests??"always",this._keyboardPeripherals=this.mergeKeyboardPeripherals(this._contentProtection,s.keyboardPeripherals||[]),(this._contentProtection.disableContextMenu||this._contentProtection.checkAutomation||this._contentProtection.checkIFrameEmbedding||this._contentProtection.monitorDevTools||this._contentProtection.protectPrinting?.disable)&&(this._navigatorProtector=new jl(this._contentProtection),this._suspiciousActivityListener=u=>{const{type:m,...p}=u.detail;m==="context_menu"?this.listeners.contextMenu(p):this.listeners.contentProtection(m,p)},window.addEventListener(ui,this._suspiciousActivityListener)),this._keyboardPeripherals.length>0&&(this._keyboardPeripheralsManager=new Gl({keyboardPeripherals:this._keyboardPeripherals}),this._keyboardPeripheralListener=u=>{const m=u.detail;this.listeners.peripheral(m)},window.addEventListener(mi,this._keyboardPeripheralListener)),this.resizeObserver=new ResizeObserver(()=>this.ownerWindow.requestAnimationFrame(async()=>await this.resizeHandler())),this.resizeObserver.observe(this.container.parentElement||document.documentElement)}static determineLayout(t,e){const i=t.metadata.effectiveLayout;if(i===w.fixed||t.metadata.otherMetadata&&"http://openmangaformat.org/schema/1.0#version"in t.metadata.otherMetadata||t.metadata?.conformsTo?.includes(ft.DIVINA))return w.fixed;if(i===w.scrolled)return w.scrolled;const o=te(t.metadata);return o==="cjk-vertical"||o==="mongolian-vertical"||i===w.reflowable&&e?w.scrolled:w.reflowable}async load(){if(this.positions?.length||(this.positions=await this.pub.positionsFromManifest()),!this._injector){const t=await this._readiumRulesPromise;this._injector=new zl({rules:[...t,...this._injectablesConfig.rules],allowedDomains:this._injectablesConfig.allowedDomains})}if(!this._destroyed){if(this._layout===w.fixed)this.framePool=new rh(this.container,this.positions,this.pub,this._layout,this._injector,this._contentProtection,this._keyboardPeripherals,[...this._decorationResizeSelectors],this._upgradeInsecureRequests),this.framePool.listener=(t,e)=>{this.eventListener(t,e)};else{if(await this.updateCSS(!1),this._destroyed)return;const t=this.compileCSSProperties(this._css);this.framePool=new Kl(this.container,this.positions,t,this._injector,this._contentProtection,this._keyboardPeripherals,e=>this.pub.timeline.segmentsForHref(e).flatMap(i=>i.references).map(i=>{const o=i.indexOf("#");return o>=0?de(i.slice(o+1)):""}).filter(Boolean),[...this._decorationResizeSelectors],this._upgradeInsecureRequests)}if(this.currentLocation===void 0?this.currentLocation=this.positions[0]:this.currentLocation=this.completeLocator(this.currentLocation),await this.resizeHandler(),!this._destroyed)return new Promise(t=>{if(this._destroyed)return t(!1);this.go(this.currentLocation,!1,t)})}}get settings(){if(this._layout===w.fixed)return Object.freeze({...this._settings});{const t=this._css.userProperties.colCount||this._css.rsProperties.colCount||this._settings.columnCount;return Object.freeze({...this._settings,columnCount:t})}}get preferencesEditor(){return this._preferencesEditor===null&&(this._preferencesEditor=new Dn(this._preferences,this.settings,this.pub.metadata)),this._preferencesEditor}async submitPreferences(t){this._preferences=this._preferences.merging(t),await this.applyPreferences()}async applyPreferences(){const t=this._settings;this._settings=new Bn(this._preferences,this._defaults),this._preferencesEditor!==null&&(this._preferencesEditor=new Dn(this._preferences,this.settings,this.pub.metadata)),this._layout===w.fixed?this.handleFXLPrefs(t,this._settings):await this.updateCSS(!0)}handleFXLPrefs(t,e){t.columnCount!==e.columnCount&&(this.framePool.setPerPage(e.columnCount),this.ownerWindow.requestAnimationFrame(()=>this.notifyViewportChange(this.listeners.viewportChanged)))}async updateCSS(t){this._css.update(this._settings),t&&await this.commitCSS(this._css)}compileCSSProperties(t){const e={};for(const[i,o]of Object.entries(t.rsProperties.toCSSProperties()))e[i]=o;for(const[i,o]of Object.entries(t.userProperties.toCSSProperties()))e[i]=o;return e}async commitCSS(t){if(!this.framePool)return;const e=this.compileCSSProperties(t);this.framePool.setCSSProperties(e),this._css.userProperties.view==="paged"&&this._layout===w.scrolled?await this.setLayout(w.reflowable):this._css.userProperties.view==="scroll"&&this._layout===w.reflowable&&await this.setLayout(w.scrolled),this._css.setContainerWidth()}async resizeHandler(){const t=this.container.parentElement||document.documentElement;if(this._layout===w.fixed){const e=ie(t)-this._settings.constraint;if(_t()?this.container.attributeStyleMap.set("width",CSS.px(e)):this.container.style.width=`${e}px`,!this.framePool)return;this.framePool.resizeHandler(),this.notifyViewportChange(this.listeners.viewportChanged)}else{const e=this._css.userProperties.colCount,i=this._css.userProperties.lineLength;this._css.resizeHandler(),(this._css.userProperties.view!=="scroll"&&e!==this._css.userProperties.colCount||i!==this._css.userProperties.lineLength)&&await this.commitCSS(this._css)}}get layout(){return this._layout}get ownerWindow(){return this.container.ownerDocument.defaultView||window}get _cframes(){return(this.framePool?.currentFrames??[]).filter(t=>!(t instanceof Dt&&t.isDestroyed))}get pool(){return this.framePool}eventListener(t,e,i){switch(t){case"_pong":if(this.listeners.frameLoaded(this._cframes[0].iframe.contentWindow),this.listeners.positionChanged(this.currentLocation),this._notifyTimelineChange(this.currentLocation),i){const l=this._cframes.filter(d=>!!d).indexOf(i),c=l>=0?this.viewport.readingOrder[l]:void 0;c&&this._reapplyDecorationsToFrame(i,c)}else this._reapplyDecorationsToCurrentFrames();this._watchTextLayoutInCurrentFrame(!0),this._sendNavigationLock();break;case"text_layout":i&&i===this._textLayoutFrame&&this.currentLocation.href.split("#")[0]===this._textLayoutWatch?.href&&this._textLayoutWatch.cb(e);break;case"pointed_piece":{const{id:l,index:c}=e;this._pointedPieceRequests.get(l)?.(c);break}case"first_visible_locator":const o=rt.deserialize(e);if(!o)break;this.currentLocation=new rt({href:this.currentLocation.href,type:this.currentLocation.type,title:this.currentLocation.title,locations:o?.locations,text:o?.text}),this.listeners.positionChanged(this.currentLocation),this._notifyTimelineChange(this.currentLocation);break;case"text_selected":{const l=e;if(i){const c=this._cframes.filter(u=>!!u).indexOf(i),d=c>=0?this.viewport.readingOrder[c]:void 0;if(d){const u=this.pub.readingOrder.findWithHref(d);l.locator=new rt({href:d,type:u.type||"application/xhtml+xml",text:new zt({highlight:l.text})})}}this.listeners.textSelected(l);break}case"decoration_activated":{this._handleDecorationActivated(e)&&(this._decorationActivationConsumed=!0);break}case"decoration_pointer_enter":this._handleDecorationPointerEnter(e);break;case"decoration_pointer_leave":this._handleDecorationPointerLeave(e);break;case"click":case"tap":if(this._decorationActivationConsumed){this._decorationActivationConsumed=!1;break}const n=e;if(n.interactiveElement){const l=new DOMParser().parseFromString(n.interactiveElement,"text/html").body.children[0];if(l.nodeType===l.ELEMENT_NODE&&l.nodeName==="A"&&l.hasAttribute("href")){const c=l.attributes.getNamedItem("href")?.value;if(c.startsWith("#"))this._navigationLocked||this.go(this.currentLocation.copyWithLocations({fragments:[new URL(c,Ch).hash.slice(1)]}),!1,()=>{});else if(c.startsWith("http://")||c.startsWith("https://")||c.startsWith("mailto:")||c.startsWith("tel:"))this.listeners.handleLocator(new gt({href:c}).locator);else if(!this._navigationLocked)try{this.goLink(new gt({href:pn.join(pn.dirname(this.currentLocation.href),c)}),!1,()=>{})}catch(d){console.warn(`Couldn't go to link for ${c}: ${d}`),this.listeners.handleLocator(new gt({href:c}).locator)}}else console.log("Clicked on",l)}else{if(this._layout===w.fixed&&this.framePool.doNotDisturb&&(n.doNotDisturb=!0),n.x+=this._spreadOffsetX(n.targetFrameSrc),t==="click"?this.listeners.click(n):this.listeners.tap(n))break;const l=(this._cframes.length===2?this._cframes[0].window.innerWidth+this._cframes[1].window.innerWidth:this._cframes[0].window.innerWidth)*window.devicePixelRatio/4;if(n.x>=l&&n.x<=l*3&&this.listeners.miscPointer(1),this._navigationLocked)break;n.x<l?this.goLeft(!1,()=>{}):n.x>l*3&&this.goRight(!1,()=>{})}break;case"tap_more":this.listeners.miscPointer(e);break;case"no_more":this._navigationLocked||this.changeResource(1);break;case"no_less":this._navigationLocked||this.changeResource(-1);break;case"swipe":break;case"scroll":this.listeners.scroll(e);break;case"zoom":this.listeners.zoom(e);break;case"progress":{const l=i instanceof Dt?this.framePool._frameFor(this.currentLocation.href.split("#")[0]):void 0;if(i instanceof Dt&&i!==l)break;this.syncLocation(e);break}case"content_protection":const s=e;this.listeners.contentProtection(s.type,s);break;case"context_menu":this.listeners.contextMenu(e);break;case"keyboard_peripherals":const a=e,h={...a,interactiveElement:void 0};a.interactiveElement&&(h.interactiveElement=new DOMParser().parseFromString(a.interactiveElement,"text/html").body.children[0]),this.listeners.peripheral(h);break;case"log":console.log(this._cframes[0]?.source?.split("/")[3],...e);break;default:this.listeners.customEvent(t,e);break}}determineModules(){let t=Array.from(ni.keys());if(this._layout===w.fixed)return t.filter(o=>cl.includes(o));t=t.filter(o=>dl.includes(o));const e=te(this.pub.metadata);if(e==="cjk-vertical"||e==="mongolian-vertical")return t.filter(o=>o!=="column_snapper"&&o!=="scroll_snapper");const i=t;return this._layout===w.scrolled?t=i.filter(o=>o!=="column_snapper"&&o!=="cjk_vertical_snapper"):t=i.filter(o=>o!=="scroll_snapper"&&o!=="cjk_vertical_snapper"),t}attachListener(){const t=this._cframes.filter(e=>!!e);if(t.length===0)throw Error("no cframe to attach listener to");t.forEach(e=>{e.msg&&(e.msg.listener=(i,o)=>{this.eventListener(i,o,e)})}),this._reapplyDecorationsToCurrentFrames(),this._watchTextLayoutInCurrentFrame(),this._sendNavigationLock()}async apply(){if(await this.framePool.update(this.pub,this.currentLocator,this.determineModules()),this.attachListener(),this.pub.readingOrder.findIndexWithHref(this.currentLocation.href)<0)throw Error("Link for "+this.currentLocation.href+" not found!");this.notifyViewportChange(this.listeners.viewportChanged)}supportsDecorationStyle(t){return _l(t,this._decoratorConfig.decorationTemplates)}registerDecorationObserver(t,e){this._decorationObservers.has(t)||this._decorationObservers.set(t,new Set),this._decorationObservers.get(t).add(e),e.onDecorationActivated&&(this._decorationActivationState.set(t,!0),this._sendDecorationActivationToFrames(t,!0)),(e.onDecorationPointerEnter||e.onDecorationPointerLeave)&&(this._decorationHoverState.set(t,!0),this._sendDecorationHoverToFrames(t,!0))}unregisterDecorationObserver(t){this._decorationObservers.forEach((e,i)=>{if(!e.has(t))return;e.delete(t);const o=[...e].some(s=>s.onDecorationActivated);this._decorationActivationState.has(i)&&!o&&(this._decorationActivationState.delete(i),this._sendDecorationActivationToFrames(i,!1));const n=[...e].some(s=>s.onDecorationPointerEnter||s.onDecorationPointerLeave);this._decorationHoverState.has(i)&&!n&&(this._decorationHoverState.delete(i),this._sendDecorationHoverToFrames(i,!1))})}_sendDecorationActivationToFrames(t,e){this._cframes.filter(i=>!!i).forEach(i=>{i.msg&&i.msg.send("decoration_activatable",{group:t,activatable:e})})}_sendDecorationHoverToFrames(t,e){this._cframes.filter(i=>!!i).forEach(i=>{i.msg&&i.msg.send("decoration_hoverable",{group:t,hoverable:e})})}addDecorationResizeTarget(t){this._decorationResizeSelectors.add(t),this.framePool?.addResizeTarget(t)}removeDecorationResizeTarget(t){this._decorationResizeSelectors.delete(t),this.framePool?.removeResizeTarget(t)}applyDecorations(t,e){const i=this._decorations.get(e)??[],o=new Map(i.map(d=>[d.id,d])),n=new Map(t.map(d=>[d.id,d])),s=[],a=[],h=[];for(const[d,u]of o)n.has(d)?vl(u,n.get(d))||h.push(n.get(d)):s.push(d);for(const[d,u]of n)o.has(d)||a.push(u);this._decorations.set(e,t),this._sendDecorationOps(e,s,a,h,i);const l=this._decorationActivationState.get(e);l!==void 0&&this._sendDecorationActivationToFrames(e,l);const c=this._decorationHoverState.get(e);c!==void 0&&this._sendDecorationHoverToFrames(e,c)}_sendDecorationOps(t,e,i,o,n){const s=this._cframes.filter(l=>!!l),a=new Map(n.map(l=>[l.id,l])),h=this.viewport.readingOrder;s.forEach((l,c)=>{if(!l.msg)return;const d=h[c];if(d){for(const u of e){const m=a.get(u);!m||m.locator.href!==d||l.msg.send("decorate",{group:t,action:"remove",decoration:{id:u}})}for(const u of i)u.locator.href===d&&l.msg.send("decorate",{group:t,action:"add",decoration:ri(u,this._decoratorConfig.decorationTemplates)});for(const u of o)a.get(u.id)?.locator.href===d&&u.locator.href!==d&&l.msg.send("decorate",{group:t,action:"remove",decoration:{id:u.id}}),u.locator.href===d&&l.msg.send("decorate",{group:t,action:"update",decoration:ri(u,this._decoratorConfig.decorationTemplates)})}})}_reapplyDecorationsToFrame(t,e){if(t.msg){for(const[i,o]of this._decorations){const n=o.filter(s=>s.locator.href===e);t.msg.send("decorate",{group:i,action:"clear"});for(const s of n)t.msg.send("decorate",{group:i,action:"add",decoration:ri(s,this._decoratorConfig.decorationTemplates)})}for(const[i,o]of this._decorationActivationState)t.msg.send("decoration_activatable",{group:i,activatable:o});for(const[i,o]of this._decorationHoverState)t.msg.send("decoration_hoverable",{group:i,hoverable:o})}}_reapplyDecorationsToCurrentFrames(){const t=this._cframes.filter(i=>!!i),e=this.viewport.readingOrder;t.forEach((i,o)=>{const n=e[o];n&&this._reapplyDecorationsToFrame(i,n)})}watchTextLayout(t,e){const i={href:t[0]?.href.split("#")[0]??"",pieces:t.map(o=>[o.text?.serialize(),kt(o.locations)]),cb:e};return this._textLayoutWatch=i,this._watchTextLayoutInCurrentFrame(!0),()=>{this._textLayoutWatch===i&&(this._textLayoutWatch=void 0,this._watchTextLayoutInCurrentFrame())}}lockNavigation(t){this._navigationLocked=t,this._sendNavigationLock()}_sendNavigationLock(){this._cframes.forEach(t=>{t instanceof Dt&&t.msg?.send("lock_navigation",this._navigationLocked)})}_spreadOffsetX(t){if(this._layout!==w.fixed||this.currentProgression!==M.rtl&&this.currentProgression!==M.ltr)return 0;const e=this.framePool.currentFrames;if(e.length<2)return 0;const i=this.currentProgression===M.rtl;return t!==e[i?0:1]?.source?0:(e[i?1:0]?.iframe.contentWindow?.innerWidth??0)*window.devicePixelRatio}async findPointedPiece(t,e){const i=this._cframes.filter(c=>!!c),o=i.findIndex(c=>c.source===t.targetFrameSrc),n=o>=0?this.viewport.readingOrder[o]:void 0;if(!n||!t.cssSelector)return;const s=e.filter(c=>c.href.split("#")[0]===n);if(s.length===0)return;const a=`${++this._pointedPieceRequestId}`;let h;const l=await new Promise(c=>{this._pointedPieceRequests.set(a,c),h=setTimeout(()=>c(-1),Rh);const d={id:a,cssSelector:t.cssSelector,x:t.x-this._spreadOffsetX(t.targetFrameSrc),y:t.y,pieces:s.map(u=>[u.text?.serialize(),kt(u.locations)])};i[o].msg?.send("pointed_piece",d,()=>c(-1))||c(-1)});return clearTimeout(h),this._pointedPieceRequests.delete(a),s[l]}_watchTextLayoutInCurrentFrame(t=!1){const e=this._cframes[0],i=this._textLayoutWatch,o=i&&e instanceof Dt&&this.currentLocation?.href.split("#")[0]===i.href?e:void 0;if(o===this._textLayoutFrame&&!t)return;const n=this._textLayoutFrame;n&&n!==o&&!n.isDestroyed&&n.msg?.send("watch_text_layout",[]),this._textLayoutFrame=o,o&&i&&o.msg?.send("watch_text_layout",i.pieces)}_handleDecorationActivated(t){const e=this._decorationObservers.get(t.group);if(!e||e.size===0)return!1;const i=(this._decorations.get(t.group)??[]).find(s=>s.id===t.decorationId);if(!i)return!1;const o={decoration:i,group:t.group,rect:t.rect,point:t.point};let n=!1;for(const s of e)s.onDecorationActivated?.(o)&&(n=!0);return n}_handleDecorationPointerEnter(t){const e=this._decorationObservers.get(t.group);if(!e||e.size===0)return;const i=(this._decorations.get(t.group)??[]).find(n=>n.id===t.decorationId);if(!i)return;this._decorationHoveredDecorations.set(t.group,i);const o={decoration:i,group:t.group,rect:t.rect,point:t.point};for(const n of e)n.onDecorationPointerEnter?.(o)}_handleDecorationPointerLeave(t){const e=this._decorationObservers.get(t.group);if(!e||e.size===0)return;const i=(this._decorations.get(t.group)??[]).find(n=>n.id===t.decorationId)??this._decorationHoveredDecorations.get(t.group);if(this._decorationHoveredDecorations.delete(t.group),!i)return;const o={decoration:i,group:t.group,rect:t.rect,point:t.point};for(const n of e)n.onDecorationPointerLeave?.(o)}async destroy(){this._destroyed=!0,this._suspiciousActivityListener&&window.removeEventListener(ui,this._suspiciousActivityListener),this._keyboardPeripheralListener&&window.removeEventListener(mi,this._keyboardPeripheralListener),this._navigatorProtector?.destroy(),this._keyboardPeripheralsManager?.destroy(),await this.framePool?.destroy(),this._decorations.clear(),this._decorationObservers.clear(),this._decorationHoveredDecorations.clear(),this._decorationActivationState.clear(),this._decorationHoverState.clear(),this._decorationResizeSelectors.clear()}async changeResource(t){if(t===0)return!1;if(this._layout===w.fixed){const o=this.framePool,n=o.viewport.positions[0];if(t===1){if(!o.next(o.perPage))return!1}else if(t===-1){if(!o.prev(o.perPage))return!1}else throw Error("Invalid relative value for FXL");const s=o.viewport.positions[0];if(n>s){for(let a=this.positions.length-1;a>=0;a--)if(this.positions[a].href===this.pub.readingOrder.items[s-1].href){this.currentLocation=this.positions[a].copyWithLocations({progression:.999999999999});break}}else if(n<s){for(let a=0;a<this.positions.length;a++)if(this.positions[a].href===this.pub.readingOrder.items[s-1].href){this.currentLocation=this.positions[a];break}}return await this.apply(),this.listeners.positionChanged(this.currentLocation),this._notifyTimelineChange(this.currentLocation),!0}const e=this.pub.readingOrder.findIndexWithHref(this.currentLocation.href),i=Math.max(0,Math.min(this.pub.readingOrder.items.length-1,e+t));if(i===e)return this._cframes[0]?.msg?.send("shake",void 0,async o=>{}),!1;if(e>i){for(let o=this.positions.length-1;o>=0;o--)if(this.positions[o].href===this.pub.readingOrder.items[i].href){this.currentLocation=this.positions[o].copyWithLocations({progression:.999999999999});break}}else for(let o=0;o<this.positions.length;o++)if(this.positions[o].href===this.pub.readingOrder.items[i].href){this.currentLocation=this.positions[o];break}return await this.apply(),!0}findLastPositionInProgressionRange(t,e){const i=t.findLastIndex(o=>{const n=o.locations.progression;return!!(n&&n>e.start&&n<=e.end)});return i!==-1?t[i]:void 0}findNearestPositions(t){const e=this.positions.filter(s=>s.href===this.currentLocation.href);let i=this.currentLocation,o;const n=e.findLastIndex(s=>(s.locations.progression??0)<=t.start);if(n!==-1){i=e[n];const s=e.slice(n+1);o=this.findLastPositionInProgressionRange(s,t)}return{first:i,last:o}}updateViewport(t){this.reflowViewport.readingOrder=[],this.reflowViewport.progressions.clear(),this.reflowViewport.positions=null,this.currentLocation&&(this.reflowViewport.readingOrder.push(this.currentLocation.href),this.reflowViewport.progressions.set(this.currentLocation.href,t),this.currentLocation.locations?.position!==void 0&&(this.reflowViewport.positions=[this.currentLocation.locations.position],this.lastLocationInView?.locations?.position!==void 0&&this.reflowViewport.positions.push(this.lastLocationInView.locations.position)))}async syncLocation(t){const e=t,i=this.findNearestPositions(e);this.currentLocation=i.first.copyWithLocations({progression:e.start}),this.lastLocationInView=i.last,this.updateViewport(e),this.notifyViewportChange(this.listeners.viewportChanged),this.listeners.positionChanged(this.currentLocation);const o=e.fragmentId?this.currentLocation.copyWithLocations({fragments:[encodeURIComponent(e.fragmentId)]}):this.currentLocation;this._visibleFragmentIds=e.visibleFragmentIds??[],this._notifyTimelineChange(o);const n=this._cframes;await this.framePool.update(this.pub,this.currentLocation,this.determineModules()),this._cframes.some((s,a)=>s&&s!==n[a])&&this.attachListener()}goBackward(t,e){if(this._isNavigating){e(!1);return}this._isNavigating=!0,this._layout===w.fixed?this.changeResource(-1).then(i=>{this._isNavigating=!1,e(i)}).catch(i=>{console.error(i),this._isNavigating=!1,e(!1)}):this._cframes[0]?.msg?.send("go_prev",void 0,async i=>{if(i)this._isNavigating=!1,e(!0);else{const o=await this.changeResource(-1);this._isNavigating=!1,e(o)}})}goForward(t,e){if(this._isNavigating){e(!1);return}this._isNavigating=!0,this._layout===w.fixed?this.changeResource(1).then(i=>{this._isNavigating=!1,e(i)}).catch(i=>{console.error(i),this._isNavigating=!1,e(!1)}):this._cframes[0]?.msg?.send("go_next",void 0,async i=>{if(i)this._isNavigating=!1,e(!0);else{const o=await this.changeResource(1);this._isNavigating=!1,e(o)}})}get currentLocator(){return this.currentLocation}get viewport(){return this._layout===w.fixed?this.framePool?this.framePool.viewport:{readingOrder:[],progressions:new Map,positions:null}:this.reflowViewport}get isScrollStart(){const t=this.viewport.readingOrder[0];return this.viewport.progressions.get(t)?.start===0}get isScrollEnd(){const t=this.viewport.readingOrder[this.viewport.readingOrder.length-1];return this.viewport.progressions.get(t)?.end===1}get canGoBackward(){const t=this.pub.readingOrder.items[0]?.href;return!(this.viewport.progressions.has(t)&&this.viewport.progressions.get(t)?.start===0)}get canGoForward(){const t=this.pub.readingOrder.items[this.pub.readingOrder.items.length-1]?.href;return!(this.viewport.progressions.has(t)&&this.viewport.progressions.get(t)?.end===1)}get readingProgression(){return this.currentProgression}async setLayout(t){this._layout!==t&&(this._layout=t,await this.framePool.update(this.pub,this.currentLocator,this.determineModules(),!0),this.attachListener())}get publication(){return this.pub}get timeline(){const t=this.pub.timeline;if(!this._timelineAugmented&&this.positions?.length){const e=this.positions,i=new Set;t.augment((o,n)=>{if(o.children?.length)return{};const s=n.href.indexOf("#"),a=s>=0?n.href.slice(0,s):n.href,h=s>=0?n.href.slice(s+1):void 0,l=e.filter(u=>u.href===a);if(!l.length)return{};const c=h?l.find(u=>u.locations.fragments?.[0]===h):void 0;let d;return c?d=c:i.has(a)?d=void 0:(i.add(a),d=l.reduce((u,m)=>(m.locations.position??1/0)<(u.locations.position??1/0)?m:u)),d?{position:d.locations.position,scroll:c?.locations.progression}:{}}),this._timelineAugmented=!0}return this._wrappedTimeline||(this._wrappedTimeline=new Proxy(t,{get:(e,i)=>{if(i!=="navigableFrom"){const o=Reflect.get(e,i,e);return typeof o=="function"?o.bind(e):o}return o=>{const n=this._visibleFragmentIds;let s=(n.length?e.locate(this.currentLocation.copyWithLocations({fragments:[encodeURIComponent(n[0])]})):void 0)??o;const a=(n.length?e.locate(this.currentLocation.copyWithLocations({fragments:[encodeURIComponent(n[n.length-1])]})):void 0)??o;if(this.isScrollStart){const c=e.ancestors(s).find(d=>d.references.includes(this.currentLocation.href));c&&(s=c)}const h=e.navigableFrom(s).previous,l=e.navigableFrom(a).next;return{previous:h,next:l}}}})),this._wrappedTimeline}async loadLocator(t,e){let i=!1,o=kt(t.locations);if(t.text?.highlight?i=await new Promise((a,h)=>{this._cframes[0].msg.send("go_text",o?[t.text?.serialize(),o]:t.text?.serialize(),l=>a(l))}):o&&(i=await new Promise((a,h)=>{this._cframes[0].msg.send("go_text",["",o],l=>a(l))})),i){e(i);return}const n=Gi(t.locations);if(n&&(i=await new Promise((a,h)=>{this._cframes[0].msg.send("go_id",n,l=>a(l))})),i){e(i);return}const s=t.locations?.progression;s&&s>0?i=await new Promise((a,h)=>{this._cframes[0].msg.send("go_progression",s,l=>a(l))}):i=!0,e(i)}completeLocator(t){if(!t.href){let e=!1;if(typeof t.locations.position=="number"){const i=this.positions.find(o=>o.locations.position===t.locations.position);i&&(t=i.copyWithLocations(t.locations),e=!0)}if(!e&&typeof t.locations?.totalProgression=="number"){const i=t.locations.totalProgression;let o=0,n=1/0;for(let s=0;s<this.positions.length;s++){const a=this.positions[s].locations.totalProgression??s/this.positions.length,h=Math.abs(a-i);h<n&&(n=h,o=s)}t=this.positions[o].copyWithLocations(t.locations)}}return t}go(t,e,i){t=this.completeLocator(t);const o=t.href.split("#")[0];let n=this.pub.readingOrder.findWithHref(o);if(!n)return i(this.listeners.handleLocator(t));if(this._isNavigating){i(!1);return}this._isNavigating=!0,this.currentLocation=this.positions.find(s=>s.href===n.href),this.apply().then(()=>this.loadLocator(t,s=>{this._isNavigating=!1,i(s)})).then(()=>{this.attachListener()}).catch(s=>{console.error(s),this._isNavigating=!1,i(!1)})}goLink(t,e,i){return this.go(t.locator,e,i)}_notifyTimelineChange(t){const e=this.timeline.locate(t),i=!Ph(this._visibleFragmentIds,this._notifiedVisibleFragmentIds);(e!==this._currentTimelineItem||i)&&(this._currentTimelineItem=e,this._notifiedVisibleFragmentIds=this._visibleFragmentIds,this.listeners.timelineItemChanged(e))}}const Fh=Object.freeze(Object.defineProperty({__proto__:null,default:`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017–2026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickaël Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

@-ms-viewport{
  width:device-width;
}

@viewport{
  width:device-width;
  zoom:1;
}

:root{

  --RS__sans-serif-ja-v:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDGothic', 'Yu Gothic', 'ＭＳゴシック', 'MS Gothic', sans-serif;

  --RS__serif-ja-v:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDMincho', 'Yu Mincho', 'ＭＳ明朝', 'MS Mincho', serif;

  --RS__sans-serif-ja:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDPGothic', 'Yu Gothic', 'ＭＳ Ｐゴシック', 'MS PGothic', sans-serif;

  --RS__serif-ja:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDPMincho', 'Yu Mincho', 'ＭＳ Ｐ明朝', 'MS PMincho', serif;

  --RS__monospaceTf:ui-monospace, 'Andale Mono', 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;

  --RS__humanistTf:Seravek, Calibri, 'Gill Sans Nova', Roboto, Ubuntu, 'DejaVu Sans', source-sans-pro, sans-serif;

  --RS__sansTf:-ui-sans-serif, -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Liberation Sans', Arial, sans-serif;

  --RS__modernTf:Athelas, Constantia, Charter, 'Bitstream Charter', Cambria, 'Georgia Pro', Georgia, serif;

  --RS__oldStyleTf:'Iowan Old Style', Sitka, 'Sitka Text', Palatino, 'Book Antiqua', 'URW Palladio L', P052, serif;

  --RS__zh-HK-lineHeightCompensation:1.167;

  --RS__zh-HK-baseFontFamily:'方體', 'PingFang HK', '方體', 'PingFang TC', '黑體', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-TW-lineHeightCompensation:1.167;

  --RS__zh-TW-baseFontFamily:'方體', 'PingFang TC', '黑體', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-Hant-lineHeightCompensation:1.167;

  --RS__zh-Hant-baseFontFamily:'方體', 'PingFang TC', '黑體', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-lineHeightCompensation:1.167;

  --RS__zh-baseFontFamily:'方体', 'PingFang SC', '黑体', 'Heiti SC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK SC', sans-serif;

  --RS__th-lineHeightCompensation:1.067;

  --RS__th-baseFontFamily:Thonburi, 'Leelawadee UI', 'Cordia New', Roboto, Noto, 'Noto Sans Thai', sans-serif;

  --RS__te-baseFontFamily:'Kohinoor Telugu', 'Telugu Sangam MN', 'Nirmala UI', Gautami, Roboto, Noto, 'Noto Sans Telugu', sans-serif;

  --RS__ta-lineHeightCompensation:1.067;

  --RS__ta-baseFontFamily:'Tamil Sangam MN', 'Nirmala UI', Latha, Roboto, Noto, 'Noto Sans Tamil', sans-serif;

  --RS__si-lineHeightCompensation:1.167;

  --RS__si-baseFontFamily:'Sinhala Sangam MN', 'Nirmala UI', 'Iskoola Pota', Roboto, Noto, 'Noto Sans Sinhala', sans-serif;

  --RS__pa-lineHeightCompensation:1.1;

  --RS__pa-baseFontFamily:'Gurmukhi MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Gurmukhi', sans-serif;

  --RS__or-lineHeightCompensation:1.167;

  --RS__or-baseFontFamily:'Oriya Sangam MN', 'Nirmala UI', Kalinga, Roboto, Noto, 'Noto Sans Oriya', sans-serif;

  --RS__ml-lineHeightCompensation:1.067;

  --RS__ml-baseFontFamily:'Malayalam Sangam MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Malayalam', sans-serif;

  --RS__lo-baseFontFamily:'Lao Sangam MN', 'Leelawadee UI', 'Lao UI', Roboto, Noto, 'Noto Sans Lao', sans-serif;

  --RS__ko-lineHeightCompensation:1.167;

  --RS__ko-baseFontFamily:'Nanum Gothic', 'Apple SD Gothic Neo', 'Malgun Gothic', Roboto, Noto, 'Noto Sans CJK KR', sans-serif;

  --RS__kn-lineHeightCompensation:1.1;

  --RS__kn-baseFontFamily:'Kannada Sangam MN', 'Nirmala UI', Tunga, Roboto, Noto, 'Noto Sans Kannada', sans-serif;

  --RS__km-lineHeightCompensation:1.067;

  --RS__km-baseFontFamily:'Khmer Sangam MN', 'Leelawadee UI', 'Khmer UI', Roboto, Noto, 'Noto Sans Khmer', sans-serif;

  --RS__ja-lineHeightCompensation:1.167;

  --RS__ja-baseFontFamily:YuGothic, 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo UI', 'MS Gothic', Roboto, Noto, 'Noto Sans CJK JP', sans-serif;

  --RS__iu-baseFontFamily:'Euphemia UCAS', Euphemia, Roboto, Noto, 'Noto Sans Canadian Aboriginal', sans-serif;

  --RS__hy-baseFontFamily:Mshtakan, Sylfaen, Roboto, Noto, 'Noto Serif Armenian', serif;

  --RS__hi-lineHeightCompensation:1.1;

  --RS__hi-baseFontFamily:'Kohinoor Devanagari', 'Devanagari Sangam MN', Kokila, 'Nirmala UI', Roboto, Noto, 'Noto Sans Devanagari', sans-serif;

  --RS__he-lineHeightCompensation:1.1;

  --RS__he-baseFontFamily:'New Peninim MT', 'Arial Hebrew', Gisha, 'Times New Roman', Roboto, Noto, 'Noto Sans Hebrew', sans-serif;

  --RS__gu-lineHeightCompensation:1.167;

  --RS__gu-baseFontFamily:'Gujarati Sangam MN', 'Nirmala UI', Shruti, Roboto, Noto, 'Noto Sans Gujarati', sans-serif;

  --RS__fa-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__chr-lineHeightCompensation:1.167;

  --RS__chr-baseFontFamily:'Plantagenet Cherokee', Roboto, Noto, 'Noto Sans Cherokee';

  --RS__bo-baseFontFamily:Kailasa, 'Microsoft Himalaya', Roboto, Noto, 'Noto Sans Tibetan', sans-serif;

  --RS__bn-lineHeightCompensation:1.067;

  --RS__bn-baseFontFamily:'Kohinoor Bangla', 'Bangla Sangam MN', Vrinda, Roboto, Noto, 'Noto Sans Bengali', sans-serif;

  --RS__ar-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__am-lineHeightCompensation:1.167;

  --RS__am-baseFontFamily:Kefa, Nyala, Roboto, Noto, 'Noto Sans Ethiopic', serif;

  --RS__latin-lineHeightCompensation:1;

  --RS__latin-baseFontFamily:var(--RS__oldStyleTf);
  --RS__baseFontFamily:var(--RS__latin-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__latin-lineHeightCompensation);
  --RS__baseLineHeight:calc(1.5 * var(--RS__lineHeightCompensation));

  --RS__selectionTextColor:inherit;

  --RS__selectionBackgroundColor:#b4d8fe;

  --RS__visitedColor:#551A8B;

  --RS__linkColor:#0000EE;

  --RS__textColor:#121212;

  --RS__backgroundColor:#FFFFFF;
  color:var(--RS__textColor) !important;

  background-color:var(--RS__backgroundColor) !important;
}

::-moz-selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

::selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

html{
  font-family:var(--RS__baseFontFamily);
  line-height:1.6;
  line-height:var(--RS__baseLineHeight);
  text-rendering:optimizelegibility;
}

h1, h2, h3{
  line-height:normal;
}

:lang(ja),
:lang(zh),
:lang(ko){
  word-wrap:break-word;
  -webkit-line-break:strict;
  -epub-line-break:strict;
  line-break:strict;
}

math{
  font-family:"Latin Modern Math", "STIX Two Math", "XITS Math", "STIX Math", "Libertinus Math", "TeX Gyre Termes Math", "TeX Gyre Bonum Math", "TeX Gyre Schola", "DejaVu Math TeX Gyre", "TeX Gyre Pagella Math", "Asana Math", "Cambria Math", "Lucida Bright Math", "Minion Math", STIXGeneral, STIXSizeOneSym, Symbol, "Times New Roman", serif;
}

:lang(am){
  --RS__baseFontFamily:var(--RS__am-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__am-lineHeightCompensation);
}

:lang(ar){
  --RS__baseFontFamily:var(--RS__ar-baseFontFamily);
}

:lang(bn){
  --RS__baseFontFamily:var(--RS__bn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__bn-lineHeightCompensation);
}

:lang(bo){
  --RS__baseFontFamily:var(--RS__bo-baseFontFamily);
}

:lang(chr){
  --RS__baseFontFamily:var(--RS__chr-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__chr-lineHeightCompensation);
}

:lang(fa){
  --RS__baseFontFamily:var(--RS__fa-baseFontFamily);
}

:lang(gu){
  --RS__baseFontFamily:var(--RS__gu-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__gu-lineHeightCompensation);
}

:lang(he){
  --RS__baseFontFamily:var(--RS__he-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__he-lineHeightCompensation);
}

:lang(hi){
  --RS__baseFontFamily:var(--RS__hi-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__hi-lineHeightCompensation);
}

:lang(hy){
  --RS__baseFontFamily:var(--RS__hy-baseFontFamily);
}

:lang(iu){
  --RS__baseFontFamily:var(--RS__iu-baseFontFamily);
}

:lang(ja){
  --RS__baseFontFamily:var(--RS__ja-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ja-lineHeightCompensation);
}

:lang(km){
  --RS__baseFontFamily:var(--RS__km-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__km-lineHeightCompensation);
}

:lang(kn){
  --RS__baseFontFamily:var(--RS__kn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__kn-lineHeightCompensation);
}

:lang(ko){
  --RS__baseFontFamily:var(--RS__ko-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ko-lineHeightCompensation);
}

:lang(lo){
  --RS__baseFontFamily:var(--RS__lo-baseFontFamily);
}

:lang(ml){
  --RS__baseFontFamily:var(--RS__ml-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ml-lineHeightCompensation);
}

:lang(or){
  --RS__baseFontFamily:var(--RS__or-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__or-lineHeightCompensation);
}

:lang(pa){
  --RS__baseFontFamily:var(--RS__pa-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__pa-lineHeightCompensation);
}

:lang(si){
  --RS__baseFontFamily:var(--RS__si-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__si-lineHeightCompensation);
}

:lang(ta){
  --RS__baseFontFamily:var(--RS__ta-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ta-lineHeightCompensation);
}

:lang(te){
  --RS__baseFontFamily:var(--RS__te-baseFontFamily);
}

:lang(th){
  --RS__baseFontFamily:var(--RS__th-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__th-lineHeightCompensation);
}

:lang(zh){
  --RS__baseFontFamily:var(--RS__zh-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-lineHeightCompensation);
}

:lang(zh-Hant){
  --RS__baseFontFamily:var(--RS__zh-Hant-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-Hant-lineHeightCompensation);
}

:lang(zh-TW){
  --RS__baseFontFamily:var(--RS__zh-TW-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-TW-lineHeightCompensation);
}

:lang(zh-HK){
  --RS__baseFontFamily:var(--RS__zh-HK-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-HK-lineHeightCompensation);
}

body{
  widows:2;
  orphans:2;
}

figcaption, th, td{
  widows:1;
  orphans:1;
}

h2, h3, h4, h5, h6, dt,
hr, caption{
  -webkit-column-break-after:avoid;
  page-break-after:avoid;
  break-after:avoid;
}

h1, h2, h3, h4, h5, h6, dt,
figure, tr{
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

body{
  -webkit-hyphenate-character:"\\002D";
  -moz-hyphenate-character:"\\002D";
  -ms-hyphenate-character:"\\002D";
  hyphenate-character:"\\002D";
  -webkit-hyphenate-limit-lines:3;
  -ms-hyphenate-limit-lines:3;
  hyphenate-limit-lines:3;
}

h1, h2, h3, h4, h5, h6, dt,
figcaption, pre, caption, address,
center, code, var{
  -ms-hyphens:none;
  -moz-hyphens:none;
  -webkit-hyphens:none;
  -epub-hyphens:none;
  hyphens:none;
}

body{
  font-variant-numeric:oldstyle-nums proportional-nums;
}

:lang(ja) body,
:lang(zh) body,
:lang(ko) body{
  font-variant-numeric:lining-nums proportional-nums;
}

h1, h2, h3, h4, h5, h6, dt{
  font-variant-numeric:lining-nums proportional-nums;
}

table{
  font-variant-numeric:lining-nums tabular-nums;
}

code, var{
  font-variant-ligatures:none;
  font-variant-numeric:lining-nums tabular-nums slashed-zero;
}

rt{
  font-variant-east-asian:ruby;
}

:lang(ar){
  font-variant-ligatures:common-ligatures;
}

:lang(ko){
  font-kerning:normal;
}

hr{
  color:inherit;
  border-color:currentcolor;
}

table, th, td{
  border-color:currentcolor;
}

figure, blockquote{
  margin:1em 5%;
}

ul, ol{
  padding-left:5%;
}

dd{
  margin-left:5%;
}

pre{
  white-space:pre-wrap;
  -ms-tab-size:2;
  -moz-tab-size:2;
  -webkit-tab-size:2;
  tab-size:2;
}

abbr[title], acronym[title]{
  text-decoration:dotted underline;
}

nobr wbr{
  white-space:normal;
}

ruby > rt, ruby > rp{
  -webkit-user-select:none;
  -moz-user-select:none;
  -ms-user-select:none;
  user-select:none;
}

*:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)),
*:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)),
*:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)),
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) cite, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) dfn, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) em, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) i,
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) cite, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) dfn, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) em, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) i,
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) cite, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) dfn, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) em, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) i{
  font-style:normal;
}

:lang(ja) a,
:lang(zh) a,
:lang(ko) a{
  text-decoration:none;
}

:root{
  --RS__maxMediaWidth:100%;
  --RS__maxMediaHeight:95vh;
  --RS__boxSizingMedia:border-box;
  --RS__boxSizingTable:border-box;
}

a, a span, span a, h1, h2, h3, h4, h5, h6{
  word-wrap:break-word;
}

div{
  max-width:var(--RS__maxMediaWidth);
}

img, svg|svg, video{
  object-fit:contain;

  width:auto;
  height:auto;
  max-width:var(--RS__maxMediaWidth);
  max-height:var(--RS__maxMediaHeight) !important;
  box-sizing:var(--RS__boxSizingMedia);
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

@supports (zoom: 1) and (not ((-webkit-column-axis: horizontal) and (-webkit-column-progression: normal))){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] img,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] svg|svg,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] video{
    zoom:calc(100% / var(--USER__fontSize));
  }
}

audio{
    max-width:100%;
    -webkit-column-break-inside:avoid;
    page-break-inside:avoid;
    break-inside:avoid;
  }

table{
  max-width:var(--RS__maxMediaWidth);
  box-sizing:var(--RS__boxSizingTable);
}`},Symbol.toStringTag,{value:"Module"})),xh=Object.freeze(Object.defineProperty({__proto__:null,default:`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017–2026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickaël Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{
  --RS__compFontFamily:var(--RS__baseFontFamily);
  --RS__codeFontFamily:var(--RS__monospaceTf);

  --RS__typeScale:1.125;
  --RS__baseFontSize:100%;

  --RS__flowSpacing:1.5rem;
  --RS__paraSpacing:0;
  --RS__paraIndent:1em;

  --RS__linkColor:#0000EE;
  --RS__visitedColor:#551A8B;

  --RS__primaryColor:;
  --RS__secondaryColor:;
}

body{
  font-size:var(--RS__baseFontSize);
  text-align:justify;
}

h1, h2, h3, h4, h5, h6{
  font-family:var(--RS__compFontFamily);
  text-align:right;
}

blockquote, figure, p, pre,
aside, footer, form, hr{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
}

p{
  margin-top:var(--RS__paraSpacing);
  margin-bottom:var(--RS__paraSpacing);
  text-indent:var(--RS__paraIndent);
}

h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p,
hr + p{
  text-indent:0;
}

pre{
  font-family:var(--RS__codeFontFamily);
}

code, kbd, samp, tt{
  font-family:var(--RS__codeFontFamily);
}

sub, sup{
  position:relative;
  font-size:67.5%;
  line-height:1;
}

sub{
  bottom:-0.2ex;
}

sup{
  bottom:0;
}

:link{
  color:var(--RS__linkColor);
}

:visited{
  color:var(--RS__visitedColor);
}

h1{
  margin-top:calc(var(--RS__flowSpacing) * 2);
  margin-bottom:calc(var(--RS__flowSpacing) * 2);
  font-size:calc(((1em * var(--RS__typeScale)) * var(--RS__typeScale)) * var(--RS__typeScale));
}

h2{
  margin-top:calc(var(--RS__flowSpacing) * 2);
  margin-bottom:var(--RS__flowSpacing);
  font-size:calc((1em * var(--RS__typeScale)) * var(--RS__typeScale));
}

h3{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:calc(1em * var(--RS__typeScale));
}

h4{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:1em;
}

h5{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:smaller;
}

h6{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:0;
  font-size:smaller;
  font-weight:normal;
}

dl, ol, ul{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
}

table{
  margin:var(--RS__flowSpacing) 0;
  border:1px solid currentcolor;
  border-collapse:collapse;
  empty-cells:show;
}

thead, tbody, tfoot, table > tr{
  vertical-align:top;
}

th{
  text-align:initial;
}

th, td{
  padding:4px;
  border:1px solid currentcolor;
}`},Symbol.toStringTag,{value:"Module"})),kh=Object.freeze(Object.defineProperty({__proto__:null,default:`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017–2026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickaël Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{

  --RS__viewportWidth:100%;

  --RS__pageGutter:0;

  --RS__defaultLineLength:100%;

  --RS__colGap:0;

  --RS__colCount:1;

  --RS__colWidth:100vw;
}

@page{
  margin:0 !important;
}

:root{
  position:relative;

  -webkit-column-width:var(--RS__colWidth);
  -moz-column-width:var(--RS__colWidth);
  column-width:var(--RS__colWidth);
  -webkit-column-count:var(--RS__colCount);
  -moz-column-count:var(--RS__colCount);
  column-count:var(--RS__colCount);

  -webkit-column-gap:var(--RS__colGap);
  -moz-column-gap:var(--RS__colGap);
  column-gap:var(--RS__colGap);
  -moz-column-fill:auto;
  column-fill:auto;
  width:var(--RS__viewportWidth);
  height:100vh;
  max-width:var(--RS__viewportWidth);
  max-height:100vh;
  min-width:var(--RS__viewportWidth);
  min-height:100vh;
  padding:0 !important;
  margin:0 !important;
  font-size:1rem !important;
  box-sizing:border-box;
  -webkit-touch-callout:none;
}

body{
  width:100%;
  max-width:var(--RS__defaultLineLength) !important;
  margin:0 auto !important;
  box-sizing:border-box;
}

:root:not([style*="readium-scroll-on"]) body{
  padding:0 var(--RS__pageGutter) !important;
}

:root:not([style*="readium-noOverflow-on"]) body{
  overflow:hidden;
}

@supports (overflow: clip){

   :root:not([style*="readium-noOverflow-on"]){
      overflow:clip;
   }

   :root:not([style*="readium-noOverflow-on"]) body{
      overflow:clip;
      overflow-clip-margin:content-box;
   }
}

:root[style*="readium-scroll-on"]{
  -webkit-columns:auto auto !important;
  -moz-columns:auto auto !important;
  columns:auto auto !important;
  width:auto !important;
  height:auto !important;
  max-width:none !important;
  max-height:none !important;
  min-width:0 !important;
  min-height:0 !important;
}

:root[style*="readium-scroll-on"] body{
  max-width:var(--RS__defaultLineLength) !important;
  box-sizing:border-box !important;
}

:root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
  overflow:auto;
}

@supports (overflow: clip){

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]){
     overflow:auto;
  }

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
     overflow:clip;
  }
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingTop"] body{
  padding-top:var(--RS__scrollPaddingTop) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingBottom"] body{
  padding-bottom:var(--RS__scrollPaddingBottom) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingLeft"] body{
  padding-left:var(--RS__scrollPaddingLeft) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingRight"] body{
  padding-right:var(--RS__scrollPaddingRight) !important;
}

:root[style*="--USER__backgroundColor"]{
  background-color:var(--USER__backgroundColor) !important;
}

:root[style*="--USER__backgroundColor"] *{
  background-color:transparent !important;
}

:root[style*="--USER__textColor"]{
  color:var(--USER__textColor) !important;
}

:root[style*="--USER__textColor"] *:not(a){
  color:inherit !important;
  background-color:transparent !important;
  border-color:currentcolor !important;
}

:root[style*="--USER__textColor"] svg text{
  fill:currentcolor !important;
  stroke:none !important;
}

:root[style*="--USER__linkColor"] a:link,
:root[style*="--USER__linkColor"] a:link *{
  color:var(--USER__linkColor) !important;
}

:root[style*="--USER__visitedColor"] a:visited,
:root[style*="--USER__visitedColor"] a:visited *{
  color:var(--USER__visitedColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::-moz-selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__colCount"]{
  -webkit-column-count:var(--USER__colCount);
  -moz-column-count:var(--USER__colCount);
  column-count:var(--USER__colCount);

  --RS__colWidth:auto;
}

:root[style*="--USER__colCount: 0"],
:root[style*="--USER__colCount:0"]{
  -webkit-column-count:1;
  -moz-column-count:1;
  column-count:1;
}

:root[style*="--USER__colCount: 0"],
:root[style*="--USER__colCount:0"],
:root[style*="--USER__colCount: 1"],
:root[style*="--USER__colCount:1"]{
  --RS__colWidth:100vw;
}

:root[style*="--USER__lineLength"] body{
    max-width:var(--USER__lineLength) !important;
  }

:root[style*="--USER__textAlign"]{
  text-align:var(--USER__textAlign);
}

:root[style*="--USER__textAlign"] body,
:root[style*="--USER__textAlign"] p:not(
  blockquote p,
  figcaption p,
  header p,
  hgroup p,
  :root[style*="readium-experimentalHeaderFiltering-on"] p[class*="title"],
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > h1 + p,
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > p:has(+ h1)
),
:root[style*="--USER__textAlign"] li,
:root[style*="--USER__textAlign"] dd{
  text-align:var(--USER__textAlign) !important;
  -moz-text-align-last:auto !important;
  -epub-text-align-last:auto !important;
  text-align-last:auto !important;
}

:root[style*="--USER__fontFamily"]{
  font-family:var(--USER__fontFamily) !important;
}

:root[style*="--USER__fontFamily"] *{
  font-family:revert !important;
}

:root:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] body{
  zoom:var(--USER__fontSize) !important;
}

:root:not([style*="readium-deprecatedFontSize-on"])[style*="readium-iOSPatch-on"][style*="--USER__fontSize"] body{
  -webkit-text-size-adjust:var(--USER__fontSize) !important;
}

@supports selector(figure:has(> img)){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> img),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> video),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> svg),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> canvas),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> iframe),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> audio),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> img:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> video:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> svg:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> canvas:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> iframe:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> audio:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] table{
    zoom:calc(100% / var(--USER__fontSize)) !important;
  }

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figcaption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] caption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] td,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] th{
    zoom:var(--USER__fontSize) !important;
  }
}

@supports not (zoom: 1){

  :root[style*="--USER__fontSize"]{
    font-size:var(--USER__fontSize) !important;
  }
}

:root[style*="readium-deprecatedFontSize-on"][style*="--USER__fontSize"]{
  font-size:var(--USER__fontSize) !important;
}

:root[style*="--USER__lineHeight"]{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__lineHeight"] body,
:root[style*="--USER__lineHeight"] p,
:root[style*="--USER__lineHeight"] li,
:root[style*="--USER__lineHeight"] div{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__paraSpacing"] p{
  margin-top:var(--USER__paraSpacing) !important;
  margin-bottom:var(--USER__paraSpacing) !important;
}

:root[style*="--USER__paraIndent"] p:not(
  blockquote p,
  figcaption p,
  header p,
  hgroup p,
  :root[style*="readium-experimentalHeaderFiltering-on"] p[class*="title"],
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > h1 + p,
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > p:has(+ h1)
){
  text-indent:var(--USER__paraIndent) !important;
}

:root[style*="--USER__paraIndent"] p *{
  text-indent:0 !important;
}

:root[style*="--USER__wordSpacing"] h1,
:root[style*="--USER__wordSpacing"] h2,
:root[style*="--USER__wordSpacing"] h3,
:root[style*="--USER__wordSpacing"] h4,
:root[style*="--USER__wordSpacing"] h5,
:root[style*="--USER__wordSpacing"] h6,
:root[style*="--USER__wordSpacing"] p,
:root[style*="--USER__wordSpacing"] li,
:root[style*="--USER__wordSpacing"] div,
:root[style*="--USER__wordSpacing"] dt,
:root[style*="--USER__wordSpacing"] dd{
  word-spacing:var(--USER__wordSpacing) !important;
}

:root[style*="--USER__ligatures"]{
  font-variant-ligatures:var(--USER__ligatures) !important;
}

:root[style*="--USER__ligatures"] *{
  font-variant-ligatures:inherit !important;
}

:root[style*="--USER__fontWeight"] body{
  font-weight:var(--USER__fontWeight) !important;
}

:root[style*="--USER__fontWeight"] b,
:root[style*="--USER__fontWeight"] strong{
  font-weight:bolder;
}

:root[style*="--USER__fontWidth"] body{
  font-stretch:var(--USER__fontWidth) !important;
}

:root[style*="--USER__fontOpticalSizing"] body{
  font-optical-sizing:var(--USER__fontOpticalSizing) !important;
}

:root[style*="readium-blend-on"] svg,
:root[style*="readium-blend-on"] img{
  background-color:transparent !important;
  mix-blend-mode:multiply !important;
}

:root[style*="--USER__darkenImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) !important;
  filter:brightness(var(--USER__darkenImages)) !important;
}

:root[style*="readium-darken-on"] img{
  -webkit-filter:brightness(80%) !important;
  filter:brightness(80%) !important;
}

:root[style*="--USER__invertImages"] img{
  -webkit-filter:invert(var(--USER__invertImages)) !important;
  filter:invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-invert-on"] img{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="--USER__darkenImages"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
  filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-darken-on"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(80%) invert(var(--USER__invertImages)) !important;
  filter:brightness(80%) invert(var(--USER__invertImages)) !important;
}

:root[style*="--USER__darkenImages"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
  filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
}

:root[style*="readium-darken-on"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(80%) invert(100%) !important;
  filter:brightness(80%) invert(100%) !important;
}

:root[style*="--USER__invertGaiji"] img[class*="gaiji"]{
  -webkit-filter:invert(var(--USER__invertGaiji)) !important;
  filter:invert(var(--USER__invertGaiji)) !important;
}

:root[style*="readium-invertGaiji-on"] img[class*="gaiji"]{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="readium-normalize-on"]{
  --USER__typeScale:1.2;
}

:root[style*="readium-normalize-on"] p,
:root[style*="readium-normalize-on"] li,
:root[style*="readium-normalize-on"] div,
:root[style*="readium-normalize-on"] pre,
:root[style*="readium-normalize-on"] dd{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] h1{
  font-size:1.75rem !important;
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h2{
  font-size:1.5rem !important;
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h3{
  font-size:1.25rem !important;
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h4,
:root[style*="readium-normalize-on"] h5,
:root[style*="readium-normalize-on"] h6{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] small{
  font-size:smaller !important;
}

:root[style*="readium-normalize-on"] sub,
:root[style*="readium-normalize-on"] sup{
  font-size:67.5% !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h1{
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h2{
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h3{
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-iPadOSPatch-on"] body{
  -webkit-text-size-adjust:none;
}

:root[style*="readium-iPadOSPatch-on"] p, 
:root[style*="readium-iPadOSPatch-on"] h1, 
:root[style*="readium-iPadOSPatch-on"] h2, 
:root[style*="readium-iPadOSPatch-on"] h3, 
:root[style*="readium-iPadOSPatch-on"] h4, 
:root[style*="readium-iPadOSPatch-on"] h5, 
:root[style*="readium-iPadOSPatch-on"] h6, 
:root[style*="readium-iPadOSPatch-on"] li, 
:root[style*="readium-iPadOSPatch-on"] th, 
:root[style*="readium-iPadOSPatch-on"] td, 
:root[style*="readium-iPadOSPatch-on"] dt, 
:root[style*="readium-iPadOSPatch-on"] dd, 
:root[style*="readium-iPadOSPatch-on"] pre, 
:root[style*="readium-iPadOSPatch-on"] address, 
:root[style*="readium-iPadOSPatch-on"] details, 
:root[style*="readium-iPadOSPatch-on"] summary,
:root[style*="readium-iPadOSPatch-on"] figcaption,
:root[style*="readium-iPadOSPatch-on"] div:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)),
:root[style*="readium-iPadOSPatch-on"] aside:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)){
  -webkit-text-zoom:reset;
}

:root[style*="readium-iPadOSPatch-on"] abbr, 
:root[style*="readium-iPadOSPatch-on"] b, 
:root[style*="readium-iPadOSPatch-on"] bdi, 
:root[style*="readium-iPadOSPatch-on"] bdo, 
:root[style*="readium-iPadOSPatch-on"] cite, 
:root[style*="readium-iPadOSPatch-on"] code, 
:root[style*="readium-iPadOSPatch-on"] dfn, 
:root[style*="readium-iPadOSPatch-on"] em, 
:root[style*="readium-iPadOSPatch-on"] i, 
:root[style*="readium-iPadOSPatch-on"] kbd, 
:root[style*="readium-iPadOSPatch-on"] mark, 
:root[style*="readium-iPadOSPatch-on"] q, 
:root[style*="readium-iPadOSPatch-on"] rp, 
:root[style*="readium-iPadOSPatch-on"] rt, 
:root[style*="readium-iPadOSPatch-on"] ruby, 
:root[style*="readium-iPadOSPatch-on"] s, 
:root[style*="readium-iPadOSPatch-on"] samp, 
:root[style*="readium-iPadOSPatch-on"] small, 
:root[style*="readium-iPadOSPatch-on"] span, 
:root[style*="readium-iPadOSPatch-on"] strong, 
:root[style*="readium-iPadOSPatch-on"] sub, 
:root[style*="readium-iPadOSPatch-on"] sup, 
:root[style*="readium-iPadOSPatch-on"] time, 
:root[style*="readium-iPadOSPatch-on"] u, 
:root[style*="readium-iPadOSPatch-on"] var{
  -webkit-text-zoom:normal;
}

:root[style*="readium-iPadOSPatch-on"] p:not(:has(b, cite, em, i, q, s, small, span, strong)):first-line{
  -webkit-text-zoom:normal;
}`},Symbol.toStringTag,{value:"Module"})),zh=Object.freeze(Object.defineProperty({__proto__:null,default:`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017–2026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickaël Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

@-ms-viewport{
  width:device-width;
}

@viewport{
  width:device-width;
  zoom:1;
}

:root{

  --RS__sans-serif-ja-v:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDGothic', 'Yu Gothic', 'ＭＳゴシック', 'MS Gothic', sans-serif;

  --RS__serif-ja-v:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDMincho', 'Yu Mincho', 'ＭＳ明朝', 'MS Mincho', serif;

  --RS__sans-serif-ja:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDPGothic', 'Yu Gothic', 'ＭＳ Ｐゴシック', 'MS PGothic', sans-serif;

  --RS__serif-ja:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDPMincho', 'Yu Mincho', 'ＭＳ Ｐ明朝', 'MS PMincho', serif;

  --RS__monospaceTf:ui-monospace, 'Andale Mono', 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;

  --RS__humanistTf:Seravek, Calibri, 'Gill Sans Nova', Roboto, Ubuntu, 'DejaVu Sans', source-sans-pro, sans-serif;

  --RS__sansTf:-ui-sans-serif, -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Liberation Sans', Arial, sans-serif;

  --RS__modernTf:Athelas, Constantia, Charter, 'Bitstream Charter', Cambria, 'Georgia Pro', Georgia, serif;

  --RS__oldStyleTf:'Iowan Old Style', Sitka, 'Sitka Text', Palatino, 'Book Antiqua', 'URW Palladio L', P052, serif;

  --RS__zh-HK-lineHeightCompensation:1.167;

  --RS__zh-HK-baseFontFamily:'方體', 'PingFang HK', '方體', 'PingFang TC', '黑體', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-TW-lineHeightCompensation:1.167;

  --RS__zh-TW-baseFontFamily:'方體', 'PingFang TC', '黑體', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-Hant-lineHeightCompensation:1.167;

  --RS__zh-Hant-baseFontFamily:'方體', 'PingFang TC', '黑體', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-lineHeightCompensation:1.167;

  --RS__zh-baseFontFamily:'方体', 'PingFang SC', '黑体', 'Heiti SC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK SC', sans-serif;

  --RS__th-lineHeightCompensation:1.067;

  --RS__th-baseFontFamily:Thonburi, 'Leelawadee UI', 'Cordia New', Roboto, Noto, 'Noto Sans Thai', sans-serif;

  --RS__te-baseFontFamily:'Kohinoor Telugu', 'Telugu Sangam MN', 'Nirmala UI', Gautami, Roboto, Noto, 'Noto Sans Telugu', sans-serif;

  --RS__ta-lineHeightCompensation:1.067;

  --RS__ta-baseFontFamily:'Tamil Sangam MN', 'Nirmala UI', Latha, Roboto, Noto, 'Noto Sans Tamil', sans-serif;

  --RS__si-lineHeightCompensation:1.167;

  --RS__si-baseFontFamily:'Sinhala Sangam MN', 'Nirmala UI', 'Iskoola Pota', Roboto, Noto, 'Noto Sans Sinhala', sans-serif;

  --RS__pa-lineHeightCompensation:1.1;

  --RS__pa-baseFontFamily:'Gurmukhi MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Gurmukhi', sans-serif;

  --RS__or-lineHeightCompensation:1.167;

  --RS__or-baseFontFamily:'Oriya Sangam MN', 'Nirmala UI', Kalinga, Roboto, Noto, 'Noto Sans Oriya', sans-serif;

  --RS__ml-lineHeightCompensation:1.067;

  --RS__ml-baseFontFamily:'Malayalam Sangam MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Malayalam', sans-serif;

  --RS__lo-baseFontFamily:'Lao Sangam MN', 'Leelawadee UI', 'Lao UI', Roboto, Noto, 'Noto Sans Lao', sans-serif;

  --RS__ko-lineHeightCompensation:1.167;

  --RS__ko-baseFontFamily:'Nanum Gothic', 'Apple SD Gothic Neo', 'Malgun Gothic', Roboto, Noto, 'Noto Sans CJK KR', sans-serif;

  --RS__kn-lineHeightCompensation:1.1;

  --RS__kn-baseFontFamily:'Kannada Sangam MN', 'Nirmala UI', Tunga, Roboto, Noto, 'Noto Sans Kannada', sans-serif;

  --RS__km-lineHeightCompensation:1.067;

  --RS__km-baseFontFamily:'Khmer Sangam MN', 'Leelawadee UI', 'Khmer UI', Roboto, Noto, 'Noto Sans Khmer', sans-serif;

  --RS__ja-lineHeightCompensation:1.167;

  --RS__ja-baseFontFamily:YuGothic, 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo UI', 'MS Gothic', Roboto, Noto, 'Noto Sans CJK JP', sans-serif;

  --RS__iu-baseFontFamily:'Euphemia UCAS', Euphemia, Roboto, Noto, 'Noto Sans Canadian Aboriginal', sans-serif;

  --RS__hy-baseFontFamily:Mshtakan, Sylfaen, Roboto, Noto, 'Noto Serif Armenian', serif;

  --RS__hi-lineHeightCompensation:1.1;

  --RS__hi-baseFontFamily:'Kohinoor Devanagari', 'Devanagari Sangam MN', Kokila, 'Nirmala UI', Roboto, Noto, 'Noto Sans Devanagari', sans-serif;

  --RS__he-lineHeightCompensation:1.1;

  --RS__he-baseFontFamily:'New Peninim MT', 'Arial Hebrew', Gisha, 'Times New Roman', Roboto, Noto, 'Noto Sans Hebrew', sans-serif;

  --RS__gu-lineHeightCompensation:1.167;

  --RS__gu-baseFontFamily:'Gujarati Sangam MN', 'Nirmala UI', Shruti, Roboto, Noto, 'Noto Sans Gujarati', sans-serif;

  --RS__fa-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__chr-lineHeightCompensation:1.167;

  --RS__chr-baseFontFamily:'Plantagenet Cherokee', Roboto, Noto, 'Noto Sans Cherokee';

  --RS__bo-baseFontFamily:Kailasa, 'Microsoft Himalaya', Roboto, Noto, 'Noto Sans Tibetan', sans-serif;

  --RS__bn-lineHeightCompensation:1.067;

  --RS__bn-baseFontFamily:'Kohinoor Bangla', 'Bangla Sangam MN', Vrinda, Roboto, Noto, 'Noto Sans Bengali', sans-serif;

  --RS__ar-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__am-lineHeightCompensation:1.167;

  --RS__am-baseFontFamily:Kefa, Nyala, Roboto, Noto, 'Noto Sans Ethiopic', serif;

  --RS__latin-lineHeightCompensation:1;

  --RS__latin-baseFontFamily:var(--RS__oldStyleTf);
  --RS__baseFontFamily:var(--RS__latin-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__latin-lineHeightCompensation);
  --RS__baseLineHeight:calc(1.5 * var(--RS__lineHeightCompensation));

  --RS__selectionTextColor:inherit;

  --RS__selectionBackgroundColor:#b4d8fe;

  --RS__visitedColor:#551A8B;

  --RS__linkColor:#0000EE;

  --RS__textColor:#121212;

  --RS__backgroundColor:#FFFFFF;
  color:var(--RS__textColor) !important;

  background-color:var(--RS__backgroundColor) !important;
}

::-moz-selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

::selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

html{
  font-family:var(--RS__baseFontFamily);
  line-height:1.6;
  line-height:var(--RS__baseLineHeight);
  text-rendering:optimizelegibility;
}

h1, h2, h3{
  line-height:normal;
}

:lang(ja),
:lang(zh),
:lang(ko){
  word-wrap:break-word;
  -webkit-line-break:strict;
  -epub-line-break:strict;
  line-break:strict;
}

math{
  font-family:"Latin Modern Math", "STIX Two Math", "XITS Math", "STIX Math", "Libertinus Math", "TeX Gyre Termes Math", "TeX Gyre Bonum Math", "TeX Gyre Schola", "DejaVu Math TeX Gyre", "TeX Gyre Pagella Math", "Asana Math", "Cambria Math", "Lucida Bright Math", "Minion Math", STIXGeneral, STIXSizeOneSym, Symbol, "Times New Roman", serif;
}

:lang(am){
  --RS__baseFontFamily:var(--RS__am-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__am-lineHeightCompensation);
}

:lang(ar){
  --RS__baseFontFamily:var(--RS__ar-baseFontFamily);
}

:lang(bn){
  --RS__baseFontFamily:var(--RS__bn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__bn-lineHeightCompensation);
}

:lang(bo){
  --RS__baseFontFamily:var(--RS__bo-baseFontFamily);
}

:lang(chr){
  --RS__baseFontFamily:var(--RS__chr-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__chr-lineHeightCompensation);
}

:lang(fa){
  --RS__baseFontFamily:var(--RS__fa-baseFontFamily);
}

:lang(gu){
  --RS__baseFontFamily:var(--RS__gu-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__gu-lineHeightCompensation);
}

:lang(he){
  --RS__baseFontFamily:var(--RS__he-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__he-lineHeightCompensation);
}

:lang(hi){
  --RS__baseFontFamily:var(--RS__hi-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__hi-lineHeightCompensation);
}

:lang(hy){
  --RS__baseFontFamily:var(--RS__hy-baseFontFamily);
}

:lang(iu){
  --RS__baseFontFamily:var(--RS__iu-baseFontFamily);
}

:lang(ja){
  --RS__baseFontFamily:var(--RS__ja-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ja-lineHeightCompensation);
}

:lang(km){
  --RS__baseFontFamily:var(--RS__km-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__km-lineHeightCompensation);
}

:lang(kn){
  --RS__baseFontFamily:var(--RS__kn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__kn-lineHeightCompensation);
}

:lang(ko){
  --RS__baseFontFamily:var(--RS__ko-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ko-lineHeightCompensation);
}

:lang(lo){
  --RS__baseFontFamily:var(--RS__lo-baseFontFamily);
}

:lang(ml){
  --RS__baseFontFamily:var(--RS__ml-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ml-lineHeightCompensation);
}

:lang(or){
  --RS__baseFontFamily:var(--RS__or-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__or-lineHeightCompensation);
}

:lang(pa){
  --RS__baseFontFamily:var(--RS__pa-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__pa-lineHeightCompensation);
}

:lang(si){
  --RS__baseFontFamily:var(--RS__si-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__si-lineHeightCompensation);
}

:lang(ta){
  --RS__baseFontFamily:var(--RS__ta-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ta-lineHeightCompensation);
}

:lang(te){
  --RS__baseFontFamily:var(--RS__te-baseFontFamily);
}

:lang(th){
  --RS__baseFontFamily:var(--RS__th-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__th-lineHeightCompensation);
}

:lang(zh){
  --RS__baseFontFamily:var(--RS__zh-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-lineHeightCompensation);
}

:lang(zh-Hant){
  --RS__baseFontFamily:var(--RS__zh-Hant-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-Hant-lineHeightCompensation);
}

:lang(zh-TW){
  --RS__baseFontFamily:var(--RS__zh-TW-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-TW-lineHeightCompensation);
}

:lang(zh-HK){
  --RS__baseFontFamily:var(--RS__zh-HK-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-HK-lineHeightCompensation);
}

body{
  widows:2;
  orphans:2;
}

figcaption, th, td{
  widows:1;
  orphans:1;
}

h2, h3, h4, h5, h6, dt,
hr, caption{
  -webkit-column-break-after:avoid;
  page-break-after:avoid;
  break-after:avoid;
}

h1, h2, h3, h4, h5, h6, dt,
figure, tr{
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

body{
  -webkit-hyphenate-character:"\\002D";
  -moz-hyphenate-character:"\\002D";
  -ms-hyphenate-character:"\\002D";
  hyphenate-character:"\\002D";
  -webkit-hyphenate-limit-lines:3;
  -ms-hyphenate-limit-lines:3;
  hyphenate-limit-lines:3;
}

h1, h2, h3, h4, h5, h6, dt,
figcaption, pre, caption, address,
center, code, var{
  -ms-hyphens:none;
  -moz-hyphens:none;
  -webkit-hyphens:none;
  -epub-hyphens:none;
  hyphens:none;
}

body{
  font-variant-numeric:oldstyle-nums proportional-nums;
}

:lang(ja) body,
:lang(zh) body,
:lang(ko) body{
  font-variant-numeric:lining-nums proportional-nums;
}

h1, h2, h3, h4, h5, h6, dt{
  font-variant-numeric:lining-nums proportional-nums;
}

table{
  font-variant-numeric:lining-nums tabular-nums;
}

code, var{
  font-variant-ligatures:none;
  font-variant-numeric:lining-nums tabular-nums slashed-zero;
}

rt{
  font-variant-east-asian:ruby;
}

:lang(ar){
  font-variant-ligatures:common-ligatures;
}

:lang(ko){
  font-kerning:normal;
}

hr{
  color:inherit;
  border-color:currentcolor;
}

table, th, td{
  border-color:currentcolor;
}

figure, blockquote{
  margin:1em 5%;
}

ul, ol{
  padding-left:5%;
}

dd{
  margin-left:5%;
}

pre{
  white-space:pre-wrap;
  -ms-tab-size:2;
  -moz-tab-size:2;
  -webkit-tab-size:2;
  tab-size:2;
}

abbr[title], acronym[title]{
  text-decoration:dotted underline;
}

nobr wbr{
  white-space:normal;
}

ruby > rt, ruby > rp{
  -webkit-user-select:none;
  -moz-user-select:none;
  -ms-user-select:none;
  user-select:none;
}

*:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)),
*:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)),
*:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)),
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) cite, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) dfn, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) em, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) i,
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) cite, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) dfn, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) em, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) i,
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) cite, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) dfn, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) em, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) i{
  font-style:normal;
}

:lang(ja) a,
:lang(zh) a,
:lang(ko) a{
  text-decoration:none;
}

:root{
  --RS__maxMediaWidth:100%;
  --RS__maxMediaHeight:95vh;
  --RS__boxSizingMedia:border-box;
  --RS__boxSizingTable:border-box;
}

a, a span, span a, h1, h2, h3, h4, h5, h6{
  word-wrap:break-word;
}

div{
  max-width:var(--RS__maxMediaWidth);
}

img, svg|svg, video{
  object-fit:contain;

  width:auto;
  height:auto;
  max-width:var(--RS__maxMediaWidth);
  max-height:var(--RS__maxMediaHeight) !important;
  box-sizing:var(--RS__boxSizingMedia);
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

@supports (zoom: 1) and (not ((-webkit-column-axis: horizontal) and (-webkit-column-progression: normal))){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] img,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] svg|svg,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] video{
    zoom:calc(100% / var(--USER__fontSize));
  }
}

audio{
    max-width:100%;
    -webkit-column-break-inside:avoid;
    page-break-inside:avoid;
    break-inside:avoid;
  }

table{
  max-width:var(--RS__maxMediaWidth);
  box-sizing:var(--RS__boxSizingTable);
}`},Symbol.toStringTag,{value:"Module"})),Th=Object.freeze(Object.defineProperty({__proto__:null,default:`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017–2026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickaël Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{

  --RS__compFontFamily:var(--RS__baseFontFamily);
  --RS__codeFontFamily:var(--RS__monospaceTf);

  --RS__typeScale:1.125;
  --RS__baseFontSize:87.5%;

  --RS__flowSpacing:1.5rem;
  --RS__paraSpacing:0;
  --RS__paraIndent:1em;

  --RS__linkColor:#0000EE;
  --RS__visitedColor:#551A8B;

  --RS__primaryColor:;
  --RS__secondaryColor:;
}

:root:lang(zh){
  --RS__paraIndent:2em;
}

:root{
  quotes:"\\201c" "\\201d" "\\2018" "\\2019";
}

body{
  font-size:var(--RS__baseFontSize);
  text-align:justify;
  text-justify:inter-character;
}

h1, h2, h3, h4, h5, h6{
  font-family:var(--RS__baseFontFamily);
  text-align:left;
  text-align:start;
}

blockquote, figure, p, pre,
aside, footer, form, hr{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
}

p{
  margin-top:var(--RS__paraSpacing);
  margin-bottom:var(--RS__paraSpacing);
  text-indent:var(--RS__paraIndent);
}

pre{
  font-family:var(--RS__codeFontFamily);
}

code, kbd, samp, tt{
  font-family:var(--RS__codeFontFamily);
}

sub, sup{
  position:relative;
  font-size:67.5%;
  line-height:1;
}

sub{
  bottom:-0.2ex;
}

sup{
  bottom:0;
}

em{
  -webkit-text-emphasis:dot;
  -epub-text-emphasis:dot;
  text-emphasis:dot;
}

:link{
  color:var(--RS__linkColor);
}

:visited{
  color:var(--RS__visitedColor);
}

h1{
  margin-top:calc(var(--RS__flowSpacing) * 2);
  margin-bottom:calc(var(--RS__flowSpacing) * 2);
  font-size:calc(((1em * var(--RS__typeScale)) * var(--RS__typeScale)) * var(--RS__typeScale));
  text-align:center;
}

h2{
  margin-top:calc(var(--RS__flowSpacing) * 2);
  margin-bottom:var(--RS__flowSpacing);
  font-size:calc((1em * var(--RS__typeScale)) * var(--RS__typeScale));
  text-align:center;
}

h3{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:calc(1em * var(--RS__typeScale));
  text-align:center;
}

h4{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-family:var(--RS__compFontFamily);
  font-size:1em;
}

h5{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-family:var(--RS__compFontFamily);
  font-size:smaller;
}

h6{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:0;
  font-family:var(--RS__compFontFamily);
  font-size:smaller;
  font-weight:normal;
}

dl, ol, ul{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
}

table{
  margin:var(--RS__flowSpacing) 0;
  border:1px solid currentcolor;
  border-collapse:collapse;
  empty-cells:show;
}

thead, tbody, tfoot, table > tr{
  vertical-align:top;
}

th{
  text-align:left;
}

th, td{
  padding:4px;
  border:1px solid currentcolor;
}`},Symbol.toStringTag,{value:"Module"})),Oh=Object.freeze(Object.defineProperty({__proto__:null,default:`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017–2026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickaël Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{

  --RS__viewportWidth:100%;

  --RS__pageGutter:0;

  --RS__defaultLineLength:100%;

  --RS__colGap:0;

  --RS__colCount:1;

  --RS__colWidth:100vw;
}

@page{
  margin:0 !important;
}

:root{
  position:relative;

  -webkit-column-width:var(--RS__colWidth);
  -moz-column-width:var(--RS__colWidth);
  column-width:var(--RS__colWidth);
  -webkit-column-count:var(--RS__colCount);
  -moz-column-count:var(--RS__colCount);
  column-count:var(--RS__colCount);

  -webkit-column-gap:var(--RS__colGap);
  -moz-column-gap:var(--RS__colGap);
  column-gap:var(--RS__colGap);
  -moz-column-fill:auto;
  column-fill:auto;
  width:var(--RS__viewportWidth);
  height:100vh;
  max-width:var(--RS__viewportWidth);
  max-height:100vh;
  min-width:var(--RS__viewportWidth);
  min-height:100vh;
  padding:0 !important;
  margin:0 !important;
  font-size:1rem !important;
  box-sizing:border-box;
  -webkit-touch-callout:none;
}

body{
  width:100%;
  max-width:var(--RS__defaultLineLength) !important;
  margin:0 auto !important;
  box-sizing:border-box;
}

:root:not([style*="readium-scroll-on"]) body{
  padding:0 var(--RS__pageGutter) !important;
}

:root:not([style*="readium-noOverflow-on"]) body{
  overflow:hidden;
}

@supports (overflow: clip){

   :root:not([style*="readium-noOverflow-on"]){
      overflow:clip;
   }

   :root:not([style*="readium-noOverflow-on"]) body{
      overflow:clip;
      overflow-clip-margin:content-box;
   }
}

:root[style*="readium-scroll-on"]{
  -webkit-columns:auto auto !important;
  -moz-columns:auto auto !important;
  columns:auto auto !important;
  width:auto !important;
  height:auto !important;
  max-width:none !important;
  max-height:none !important;
  min-width:0 !important;
  min-height:0 !important;
}

:root[style*="readium-scroll-on"] body{
  max-width:var(--RS__defaultLineLength) !important;
  box-sizing:border-box !important;
}

:root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
  overflow:auto;
}

@supports (overflow: clip){

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]){
     overflow:auto;
  }

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
     overflow:clip;
  }
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingTop"] body{
  padding-top:var(--RS__scrollPaddingTop) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingBottom"] body{
  padding-bottom:var(--RS__scrollPaddingBottom) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingLeft"] body{
  padding-left:var(--RS__scrollPaddingLeft) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingRight"] body{
  padding-right:var(--RS__scrollPaddingRight) !important;
}

:root[style*="--USER__backgroundColor"]{
  background-color:var(--USER__backgroundColor) !important;
}

:root[style*="--USER__backgroundColor"] *{
  background-color:transparent !important;
}

:root[style*="--USER__textColor"]{
  color:var(--USER__textColor) !important;
}

:root[style*="--USER__textColor"] *:not(a){
  color:inherit !important;
  background-color:transparent !important;
  border-color:currentcolor !important;
}

:root[style*="--USER__textColor"] svg text{
  fill:currentcolor !important;
  stroke:none !important;
}

:root[style*="--USER__linkColor"] a:link,
:root[style*="--USER__linkColor"] a:link *{
  color:var(--USER__linkColor) !important;
}

:root[style*="--USER__visitedColor"] a:visited,
:root[style*="--USER__visitedColor"] a:visited *{
  color:var(--USER__visitedColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::-moz-selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__colCount"]{
  -webkit-column-count:var(--USER__colCount);
  -moz-column-count:var(--USER__colCount);
  column-count:var(--USER__colCount);

  --RS__colWidth:auto;
}

:root[style*="--USER__colCount: 0"],
:root[style*="--USER__colCount:0"]{
  -webkit-column-count:1;
  -moz-column-count:1;
  column-count:1;
}

:root[style*="--USER__colCount: 0"],
:root[style*="--USER__colCount:0"],
:root[style*="--USER__colCount: 1"],
:root[style*="--USER__colCount:1"]{
  --RS__colWidth:100vw;
}

:root[style*="--USER__lineLength"] body{
    max-width:var(--USER__lineLength) !important;
  }

:root[style*="--USER__fontFamily"]{
  font-family:var(--USER__fontFamily) !important;
}

:root[style*="--USER__fontFamily"] *{
  font-family:revert !important;
}

:root:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] body{
  zoom:var(--USER__fontSize) !important;
}

:root:not([style*="readium-deprecatedFontSize-on"])[style*="readium-iOSPatch-on"][style*="--USER__fontSize"] body{
  -webkit-text-size-adjust:var(--USER__fontSize) !important;
}

@supports selector(figure:has(> img)){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> img),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> video),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> svg),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> canvas),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> iframe),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> audio),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> img:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> video:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> svg:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> canvas:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> iframe:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> audio:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] table{
    zoom:calc(100% / var(--USER__fontSize)) !important;
  }

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figcaption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] caption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] td,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] th{
    zoom:var(--USER__fontSize) !important;
  }
}

@supports not (zoom: 1){

  :root[style*="--USER__fontSize"]{
    font-size:var(--USER__fontSize) !important;
  }
}

:root[style*="readium-deprecatedFontSize-on"][style*="--USER__fontSize"]{
  font-size:var(--USER__fontSize) !important;
}

:root[style*="--USER__lineHeight"]{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__lineHeight"] body,
:root[style*="--USER__lineHeight"] p,
:root[style*="--USER__lineHeight"] li,
:root[style*="--USER__lineHeight"] div{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__paraSpacing"] p{
  margin-top:var(--USER__paraSpacing) !important;
  margin-bottom:var(--USER__paraSpacing) !important;
}

:root[style*="--USER__fontWeight"] body{
  font-weight:var(--USER__fontWeight) !important;
}

:root[style*="--USER__fontWeight"] b,
:root[style*="--USER__fontWeight"] strong{
  font-weight:bolder;
}

:root[style*="--USER__fontWidth"] body{
  font-stretch:var(--USER__fontWidth) !important;
}

:root[style*="--USER__fontOpticalSizing"] body{
  font-optical-sizing:var(--USER__fontOpticalSizing) !important;
}

:root[style*="--USER__letterSpacing"] h1,
:root[style*="--USER__letterSpacing"] h2,
:root[style*="--USER__letterSpacing"] h3,
:root[style*="--USER__letterSpacing"] h4,
:root[style*="--USER__letterSpacing"] h5,
:root[style*="--USER__letterSpacing"] h6,
:root[style*="--USER__letterSpacing"] p,
:root[style*="--USER__letterSpacing"] li,
:root[style*="--USER__letterSpacing"] div,
:root[style*="--USER__letterSpacing"] dt,
:root[style*="--USER__letterSpacing"] dd{
  letter-spacing:var(--USER__letterSpacing) !important;
  font-variant:none !important;
}

:root[style*="readium-noRuby-on"] body rt,
:root[style*="readium-noRuby-on"] body rp{
  display:none;
}

:root[style*="readium-blend-on"] svg,
:root[style*="readium-blend-on"] img{
  background-color:transparent !important;
  mix-blend-mode:multiply !important;
}

:root[style*="--USER__darkenImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) !important;
  filter:brightness(var(--USER__darkenImages)) !important;
}

:root[style*="readium-darken-on"] img{
  -webkit-filter:brightness(80%) !important;
  filter:brightness(80%) !important;
}

:root[style*="--USER__invertImages"] img{
  -webkit-filter:invert(var(--USER__invertImages)) !important;
  filter:invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-invert-on"] img{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="--USER__darkenImages"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
  filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-darken-on"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(80%) invert(var(--USER__invertImages)) !important;
  filter:brightness(80%) invert(var(--USER__invertImages)) !important;
}

:root[style*="--USER__darkenImages"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
  filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
}

:root[style*="readium-darken-on"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(80%) invert(100%) !important;
  filter:brightness(80%) invert(100%) !important;
}

:root[style*="--USER__invertGaiji"] img[class*="gaiji"]{
  -webkit-filter:invert(var(--USER__invertGaiji)) !important;
  filter:invert(var(--USER__invertGaiji)) !important;
}

:root[style*="readium-invertGaiji-on"] img[class*="gaiji"]{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="readium-normalize-on"]{
  --USER__typeScale:1.2;
}

:root[style*="readium-normalize-on"] p,
:root[style*="readium-normalize-on"] li,
:root[style*="readium-normalize-on"] div,
:root[style*="readium-normalize-on"] pre,
:root[style*="readium-normalize-on"] dd{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] h1{
  font-size:1.75rem !important;
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h2{
  font-size:1.5rem !important;
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h3{
  font-size:1.25rem !important;
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h4,
:root[style*="readium-normalize-on"] h5,
:root[style*="readium-normalize-on"] h6{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] small{
  font-size:smaller !important;
}

:root[style*="readium-normalize-on"] sub,
:root[style*="readium-normalize-on"] sup{
  font-size:67.5% !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h1{
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h2{
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h3{
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-iPadOSPatch-on"] body{
  -webkit-text-size-adjust:none;
}

:root[style*="readium-iPadOSPatch-on"] p, 
:root[style*="readium-iPadOSPatch-on"] h1, 
:root[style*="readium-iPadOSPatch-on"] h2, 
:root[style*="readium-iPadOSPatch-on"] h3, 
:root[style*="readium-iPadOSPatch-on"] h4, 
:root[style*="readium-iPadOSPatch-on"] h5, 
:root[style*="readium-iPadOSPatch-on"] h6, 
:root[style*="readium-iPadOSPatch-on"] li, 
:root[style*="readium-iPadOSPatch-on"] th, 
:root[style*="readium-iPadOSPatch-on"] td, 
:root[style*="readium-iPadOSPatch-on"] dt, 
:root[style*="readium-iPadOSPatch-on"] dd, 
:root[style*="readium-iPadOSPatch-on"] pre, 
:root[style*="readium-iPadOSPatch-on"] address, 
:root[style*="readium-iPadOSPatch-on"] details, 
:root[style*="readium-iPadOSPatch-on"] summary,
:root[style*="readium-iPadOSPatch-on"] figcaption,
:root[style*="readium-iPadOSPatch-on"] div:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)),
:root[style*="readium-iPadOSPatch-on"] aside:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)){
  -webkit-text-zoom:reset;
}

:root[style*="readium-iPadOSPatch-on"] abbr, 
:root[style*="readium-iPadOSPatch-on"] b, 
:root[style*="readium-iPadOSPatch-on"] bdi, 
:root[style*="readium-iPadOSPatch-on"] bdo, 
:root[style*="readium-iPadOSPatch-on"] cite, 
:root[style*="readium-iPadOSPatch-on"] code, 
:root[style*="readium-iPadOSPatch-on"] dfn, 
:root[style*="readium-iPadOSPatch-on"] em, 
:root[style*="readium-iPadOSPatch-on"] i, 
:root[style*="readium-iPadOSPatch-on"] kbd, 
:root[style*="readium-iPadOSPatch-on"] mark, 
:root[style*="readium-iPadOSPatch-on"] q, 
:root[style*="readium-iPadOSPatch-on"] rp, 
:root[style*="readium-iPadOSPatch-on"] rt, 
:root[style*="readium-iPadOSPatch-on"] ruby, 
:root[style*="readium-iPadOSPatch-on"] s, 
:root[style*="readium-iPadOSPatch-on"] samp, 
:root[style*="readium-iPadOSPatch-on"] small, 
:root[style*="readium-iPadOSPatch-on"] span, 
:root[style*="readium-iPadOSPatch-on"] strong, 
:root[style*="readium-iPadOSPatch-on"] sub, 
:root[style*="readium-iPadOSPatch-on"] sup, 
:root[style*="readium-iPadOSPatch-on"] time, 
:root[style*="readium-iPadOSPatch-on"] u, 
:root[style*="readium-iPadOSPatch-on"] var{
  -webkit-text-zoom:normal;
}

:root[style*="readium-iPadOSPatch-on"] p:not(:has(b, cite, em, i, q, s, small, span, strong)):first-line{
  -webkit-text-zoom:normal;
}`},Symbol.toStringTag,{value:"Module"})),Mh=Object.freeze(Object.defineProperty({__proto__:null,default:`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017–2026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickaël Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

@-ms-viewport{
  width:device-width;
}

@viewport{
  width:device-width;
  zoom:1;
}

:root{

  --RS__sans-serif-ja-v:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDGothic', 'Yu Gothic', 'ＭＳゴシック', 'MS Gothic', sans-serif;

  --RS__serif-ja-v:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDMincho', 'Yu Mincho', 'ＭＳ明朝', 'MS Mincho', serif;

  --RS__sans-serif-ja:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDPGothic', 'Yu Gothic', 'ＭＳ Ｐゴシック', 'MS PGothic', sans-serif;

  --RS__serif-ja:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDPMincho', 'Yu Mincho', 'ＭＳ Ｐ明朝', 'MS PMincho', serif;

  --RS__monospaceTf:ui-monospace, 'Andale Mono', 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;

  --RS__humanistTf:Seravek, Calibri, 'Gill Sans Nova', Roboto, Ubuntu, 'DejaVu Sans', source-sans-pro, sans-serif;

  --RS__sansTf:-ui-sans-serif, -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Liberation Sans', Arial, sans-serif;

  --RS__modernTf:Athelas, Constantia, Charter, 'Bitstream Charter', Cambria, 'Georgia Pro', Georgia, serif;

  --RS__oldStyleTf:'Iowan Old Style', Sitka, 'Sitka Text', Palatino, 'Book Antiqua', 'URW Palladio L', P052, serif;

  --RS__zh-HK-lineHeightCompensation:1.167;

  --RS__zh-HK-baseFontFamily:'方體', 'PingFang HK', '方體', 'PingFang TC', '黑體', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-TW-lineHeightCompensation:1.167;

  --RS__zh-TW-baseFontFamily:'方體', 'PingFang TC', '黑體', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-Hant-lineHeightCompensation:1.167;

  --RS__zh-Hant-baseFontFamily:'方體', 'PingFang TC', '黑體', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-lineHeightCompensation:1.167;

  --RS__zh-baseFontFamily:'方体', 'PingFang SC', '黑体', 'Heiti SC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK SC', sans-serif;

  --RS__th-lineHeightCompensation:1.067;

  --RS__th-baseFontFamily:Thonburi, 'Leelawadee UI', 'Cordia New', Roboto, Noto, 'Noto Sans Thai', sans-serif;

  --RS__te-baseFontFamily:'Kohinoor Telugu', 'Telugu Sangam MN', 'Nirmala UI', Gautami, Roboto, Noto, 'Noto Sans Telugu', sans-serif;

  --RS__ta-lineHeightCompensation:1.067;

  --RS__ta-baseFontFamily:'Tamil Sangam MN', 'Nirmala UI', Latha, Roboto, Noto, 'Noto Sans Tamil', sans-serif;

  --RS__si-lineHeightCompensation:1.167;

  --RS__si-baseFontFamily:'Sinhala Sangam MN', 'Nirmala UI', 'Iskoola Pota', Roboto, Noto, 'Noto Sans Sinhala', sans-serif;

  --RS__pa-lineHeightCompensation:1.1;

  --RS__pa-baseFontFamily:'Gurmukhi MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Gurmukhi', sans-serif;

  --RS__or-lineHeightCompensation:1.167;

  --RS__or-baseFontFamily:'Oriya Sangam MN', 'Nirmala UI', Kalinga, Roboto, Noto, 'Noto Sans Oriya', sans-serif;

  --RS__ml-lineHeightCompensation:1.067;

  --RS__ml-baseFontFamily:'Malayalam Sangam MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Malayalam', sans-serif;

  --RS__lo-baseFontFamily:'Lao Sangam MN', 'Leelawadee UI', 'Lao UI', Roboto, Noto, 'Noto Sans Lao', sans-serif;

  --RS__ko-lineHeightCompensation:1.167;

  --RS__ko-baseFontFamily:'Nanum Gothic', 'Apple SD Gothic Neo', 'Malgun Gothic', Roboto, Noto, 'Noto Sans CJK KR', sans-serif;

  --RS__kn-lineHeightCompensation:1.1;

  --RS__kn-baseFontFamily:'Kannada Sangam MN', 'Nirmala UI', Tunga, Roboto, Noto, 'Noto Sans Kannada', sans-serif;

  --RS__km-lineHeightCompensation:1.067;

  --RS__km-baseFontFamily:'Khmer Sangam MN', 'Leelawadee UI', 'Khmer UI', Roboto, Noto, 'Noto Sans Khmer', sans-serif;

  --RS__ja-lineHeightCompensation:1.167;

  --RS__ja-baseFontFamily:YuGothic, 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo UI', 'MS Gothic', Roboto, Noto, 'Noto Sans CJK JP', sans-serif;

  --RS__iu-baseFontFamily:'Euphemia UCAS', Euphemia, Roboto, Noto, 'Noto Sans Canadian Aboriginal', sans-serif;

  --RS__hy-baseFontFamily:Mshtakan, Sylfaen, Roboto, Noto, 'Noto Serif Armenian', serif;

  --RS__hi-lineHeightCompensation:1.1;

  --RS__hi-baseFontFamily:'Kohinoor Devanagari', 'Devanagari Sangam MN', Kokila, 'Nirmala UI', Roboto, Noto, 'Noto Sans Devanagari', sans-serif;

  --RS__he-lineHeightCompensation:1.1;

  --RS__he-baseFontFamily:'New Peninim MT', 'Arial Hebrew', Gisha, 'Times New Roman', Roboto, Noto, 'Noto Sans Hebrew', sans-serif;

  --RS__gu-lineHeightCompensation:1.167;

  --RS__gu-baseFontFamily:'Gujarati Sangam MN', 'Nirmala UI', Shruti, Roboto, Noto, 'Noto Sans Gujarati', sans-serif;

  --RS__fa-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__chr-lineHeightCompensation:1.167;

  --RS__chr-baseFontFamily:'Plantagenet Cherokee', Roboto, Noto, 'Noto Sans Cherokee';

  --RS__bo-baseFontFamily:Kailasa, 'Microsoft Himalaya', Roboto, Noto, 'Noto Sans Tibetan', sans-serif;

  --RS__bn-lineHeightCompensation:1.067;

  --RS__bn-baseFontFamily:'Kohinoor Bangla', 'Bangla Sangam MN', Vrinda, Roboto, Noto, 'Noto Sans Bengali', sans-serif;

  --RS__ar-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__am-lineHeightCompensation:1.167;

  --RS__am-baseFontFamily:Kefa, Nyala, Roboto, Noto, 'Noto Sans Ethiopic', serif;

  --RS__latin-lineHeightCompensation:1;

  --RS__latin-baseFontFamily:var(--RS__oldStyleTf);
  --RS__baseFontFamily:var(--RS__latin-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__latin-lineHeightCompensation);
  --RS__baseLineHeight:calc(1.5 * var(--RS__lineHeightCompensation));

  --RS__selectionTextColor:inherit;

  --RS__selectionBackgroundColor:#b4d8fe;

  --RS__visitedColor:#551A8B;

  --RS__linkColor:#0000EE;

  --RS__textColor:#121212;

  --RS__backgroundColor:#FFFFFF;
  color:var(--RS__textColor) !important;

  background-color:var(--RS__backgroundColor) !important;
}

::-moz-selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

::selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

html{
  font-family:var(--RS__baseFontFamily);
  line-height:1.6;
  line-height:var(--RS__baseLineHeight);
  text-rendering:optimizelegibility;
}

h1, h2, h3{
  line-height:normal;
}

:lang(ja),
:lang(zh),
:lang(ko){
  word-wrap:break-word;
  -webkit-line-break:strict;
  -epub-line-break:strict;
  line-break:strict;
}

math{
  font-family:"Latin Modern Math", "STIX Two Math", "XITS Math", "STIX Math", "Libertinus Math", "TeX Gyre Termes Math", "TeX Gyre Bonum Math", "TeX Gyre Schola", "DejaVu Math TeX Gyre", "TeX Gyre Pagella Math", "Asana Math", "Cambria Math", "Lucida Bright Math", "Minion Math", STIXGeneral, STIXSizeOneSym, Symbol, "Times New Roman", serif;
}

:lang(am){
  --RS__baseFontFamily:var(--RS__am-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__am-lineHeightCompensation);
}

:lang(ar){
  --RS__baseFontFamily:var(--RS__ar-baseFontFamily);
}

:lang(bn){
  --RS__baseFontFamily:var(--RS__bn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__bn-lineHeightCompensation);
}

:lang(bo){
  --RS__baseFontFamily:var(--RS__bo-baseFontFamily);
}

:lang(chr){
  --RS__baseFontFamily:var(--RS__chr-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__chr-lineHeightCompensation);
}

:lang(fa){
  --RS__baseFontFamily:var(--RS__fa-baseFontFamily);
}

:lang(gu){
  --RS__baseFontFamily:var(--RS__gu-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__gu-lineHeightCompensation);
}

:lang(he){
  --RS__baseFontFamily:var(--RS__he-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__he-lineHeightCompensation);
}

:lang(hi){
  --RS__baseFontFamily:var(--RS__hi-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__hi-lineHeightCompensation);
}

:lang(hy){
  --RS__baseFontFamily:var(--RS__hy-baseFontFamily);
}

:lang(iu){
  --RS__baseFontFamily:var(--RS__iu-baseFontFamily);
}

:lang(ja){
  --RS__baseFontFamily:var(--RS__ja-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ja-lineHeightCompensation);
}

:lang(km){
  --RS__baseFontFamily:var(--RS__km-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__km-lineHeightCompensation);
}

:lang(kn){
  --RS__baseFontFamily:var(--RS__kn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__kn-lineHeightCompensation);
}

:lang(ko){
  --RS__baseFontFamily:var(--RS__ko-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ko-lineHeightCompensation);
}

:lang(lo){
  --RS__baseFontFamily:var(--RS__lo-baseFontFamily);
}

:lang(ml){
  --RS__baseFontFamily:var(--RS__ml-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ml-lineHeightCompensation);
}

:lang(or){
  --RS__baseFontFamily:var(--RS__or-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__or-lineHeightCompensation);
}

:lang(pa){
  --RS__baseFontFamily:var(--RS__pa-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__pa-lineHeightCompensation);
}

:lang(si){
  --RS__baseFontFamily:var(--RS__si-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__si-lineHeightCompensation);
}

:lang(ta){
  --RS__baseFontFamily:var(--RS__ta-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ta-lineHeightCompensation);
}

:lang(te){
  --RS__baseFontFamily:var(--RS__te-baseFontFamily);
}

:lang(th){
  --RS__baseFontFamily:var(--RS__th-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__th-lineHeightCompensation);
}

:lang(zh){
  --RS__baseFontFamily:var(--RS__zh-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-lineHeightCompensation);
}

:lang(zh-Hant){
  --RS__baseFontFamily:var(--RS__zh-Hant-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-Hant-lineHeightCompensation);
}

:lang(zh-TW){
  --RS__baseFontFamily:var(--RS__zh-TW-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-TW-lineHeightCompensation);
}

:lang(zh-HK){
  --RS__baseFontFamily:var(--RS__zh-HK-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-HK-lineHeightCompensation);
}

body{
  widows:2;
  orphans:2;
}

figcaption, th, td{
  widows:1;
  orphans:1;
}

h2, h3, h4, h5, h6, dt,
hr, caption{
  -webkit-column-break-after:avoid;
  page-break-after:avoid;
  break-after:avoid;
}

h1, h2, h3, h4, h5, h6, dt,
figure, tr{
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

body{
  -webkit-hyphenate-character:"\\002D";
  -moz-hyphenate-character:"\\002D";
  -ms-hyphenate-character:"\\002D";
  hyphenate-character:"\\002D";
  -webkit-hyphenate-limit-lines:3;
  -ms-hyphenate-limit-lines:3;
  hyphenate-limit-lines:3;
}

h1, h2, h3, h4, h5, h6, dt,
figcaption, pre, caption, address,
center, code, var{
  -ms-hyphens:none;
  -moz-hyphens:none;
  -webkit-hyphens:none;
  -epub-hyphens:none;
  hyphens:none;
}

body{
  font-variant-numeric:oldstyle-nums proportional-nums;
}

:lang(ja) body,
:lang(zh) body,
:lang(ko) body{
  font-variant-numeric:lining-nums proportional-nums;
}

h1, h2, h3, h4, h5, h6, dt{
  font-variant-numeric:lining-nums proportional-nums;
}

table{
  font-variant-numeric:lining-nums tabular-nums;
}

code, var{
  font-variant-ligatures:none;
  font-variant-numeric:lining-nums tabular-nums slashed-zero;
}

rt{
  font-variant-east-asian:ruby;
}

:lang(ar){
  font-variant-ligatures:common-ligatures;
}

:lang(ko){
  font-kerning:normal;
}

hr{
  color:inherit;
  border-color:currentcolor;
}

table, th, td{
  border-color:currentcolor;
}

figure, blockquote{
  margin:1em 5%;
}

ul, ol{
  padding-left:5%;
}

dd{
  margin-left:5%;
}

pre{
  white-space:pre-wrap;
  -ms-tab-size:2;
  -moz-tab-size:2;
  -webkit-tab-size:2;
  tab-size:2;
}

abbr[title], acronym[title]{
  text-decoration:dotted underline;
}

nobr wbr{
  white-space:normal;
}

ruby > rt, ruby > rp{
  -webkit-user-select:none;
  -moz-user-select:none;
  -ms-user-select:none;
  user-select:none;
}

*:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)),
*:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)),
*:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)),
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) cite, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) dfn, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) em, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) i,
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) cite, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) dfn, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) em, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) i,
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) cite, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) dfn, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) em, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) i{
  font-style:normal;
}

:lang(ja) a,
:lang(zh) a,
:lang(ko) a{
  text-decoration:none;
}

:root{
  --RS__maxMediaWidth:100%;
  --RS__maxMediaHeight:100vw;
  --RS__boxSizingMedia:border-box;
  --RS__boxSizingTable:border-box;
}

a, a span, span a, h1, h2, h3, h4, h5, h6{
  word-wrap:break-word;
}

div{
  max-width:var(--RS__maxMediaHeight);
}

img, svg|svg, video{
  object-fit:contain;

  width:auto;
  height:auto;
  max-width:var(--RS__maxMediaHeight);
  max-height:var(--RS__maxMediaWidth) !important;
  box-sizing:var(--RS__boxSizingMedia);
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

@supports (zoom: 1) and (not ((-webkit-column-axis: horizontal) and (-webkit-column-progression: normal))){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] img,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] svg|svg,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] video,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div{
    zoom:calc(100% / var(--USER__fontSize));
  }
}

audio{
  max-width:100%;
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

table{
  max-height:var(--RS__maxMediaWidth);
  box-sizing:var(--RS__boxSizingTable);
}`},Symbol.toStringTag,{value:"Module"})),Nh=Object.freeze(Object.defineProperty({__proto__:null,default:`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017–2026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickaël Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{

  --RS__compFontFamily:var(--RS__baseFontFamily);
  --RS__codeFontFamily:var(--RS__monospaceTf);

  --RS__typeScale:1.125;
  --RS__baseFontSize:87.5%;

  --RS__flowSpacing:1.5rem;
  --RS__paraSpacing:0;
  --RS__paraIndent:1em;

  --RS__linkColor:#0000EE;
  --RS__visitedColor:#551A8B;

  --RS__primaryColor:;
  --RS__secondaryColor:;
}

:root:lang(zh){
  --RS__paraIndent:2em;
}

:lang("mn-Mong"){
  --RS__baseFontSize:100%;
}

body{
  font-size:var(--RS__baseFontSize);
  text-align:justify;
  text-justify:inter-character;
}

h1, h2, h3, h4, h5, h6{
  font-family:var(--RS__baseFontFamily);
  text-align:left;
  text-align:start;
}

blockquote, figure, p, pre,
aside, footer, form, hr{
  margin-right:var(--RS__flowSpacing);
  margin-left:var(--RS__flowSpacing);
}

p{
  margin-right:var(--RS__paraSpacing);
  margin-left:var(--RS__paraSpacing);
  text-indent:var(--RS__paraIndent);
}

pre{
  font-family:var(--RS__codeFontFamily);
}

code, kbd, samp, tt{
  font-family:var(--RS__codeFontFamily);
}

sub, sup{
  position:relative;
  font-size:67.5%;
  line-height:1;
}

sub{
  left:-0.2ex;
}

sup{
  right:0;
}

em{
  -webkit-text-emphasis:sesame;
  -epub-text-emphasis:sesame;
  text-emphasis:sesame;
}

:link{
  color:var(--RS__linkColor);
}

:visited{
  color:var(--RS__visitedColor);
}

h1{
  margin-right:calc(var(--RS__flowSpacing) * 2);
  margin-left:calc(var(--RS__flowSpacing) * 2);
  font-size:calc(((1em * var(--RS__typeScale)) * var(--RS__typeScale)) * var(--RS__typeScale));
  text-indent:2rem;
}

h2{
  margin-right:calc(var(--RS__flowSpacing) * 2);
  margin-left:var(--RS__flowSpacing);
  font-size:calc((1em * var(--RS__typeScale)) * var(--RS__typeScale));
  text-indent:3rem;
}

h3{
  margin-right:var(--RS__flowSpacing);
  margin-left:var(--RS__flowSpacing);
  font-size:calc(1em * var(--RS__typeScale));
  text-indent:4rem;
}

h4{
  margin-right:var(--RS__flowSpacing);
  margin-left:var(--RS__flowSpacing);
  font-family:var(--RS__compFontFamily);
  font-size:1em;
  text-indent:4rem;
}

h5{
  margin-right:var(--RS__flowSpacing);
  margin-left:var(--RS__flowSpacing);
  font-family:var(--RS__compFontFamily);
  font-size:smaller;
  text-indent:4rem;
}

h6{
  margin-right:var(--RS__flowSpacing);
  margin-left:0;
  font-family:var(--RS__compFontFamily);
  font-size:smaller;
  font-weight:normal;
  text-indent:4rem;
}

dl, ol, ul{
  margin-right:var(--RS__flowSpacing);
  margin-left:var(--RS__flowSpacing);
}

table{
  margin:0 var(--RS__flowSpacing);
  border:1px solid currentcolor;
  border-collapse:collapse;
  empty-cells:show;
}

thead, tbody, tfoot, table > tr{
  vertical-align:top;
}

th{
  text-align:left;
}

th, td{
  padding:4px;
  border:1px solid currentcolor;
}`},Symbol.toStringTag,{value:"Module"})),Lh=Object.freeze(Object.defineProperty({__proto__:null,default:`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017–2026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickaël Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{

   --RS__viewportWidth:100%;

   --RS__pageGutter:0;

   --RS__defaultLineLength:100%;

   --RS__colGap:0;

   --RS__colCount:1;

   --RS__colWidth:100vw;
}

@page{
  margin:0 !important;
}

:root{
  position:relative;

  -webkit-column-width:var(--RS__colWidth);
  -moz-column-width:var(--RS__colWidth);
  column-width:var(--RS__colWidth);
  -webkit-column-count:var(--RS__colCount);
  -moz-column-count:var(--RS__colCount);
  column-count:var(--RS__colCount);

  -webkit-column-gap:var(--RS__colGap);
  -moz-column-gap:var(--RS__colGap);
  column-gap:var(--RS__colGap);
  -moz-column-fill:auto;
  column-fill:auto;
  width:100%;
  height:100vh;
  max-width:100%;
  max-height:100vh;
  min-width:100%;
  min-height:100vh;
  padding:0 !important;
  margin:0 !important;
  font-size:1rem !important;
  box-sizing:border-box;

  hanging-punctuation:last allow-end;
  -webkit-touch-callout:none;
  -ms-writing-mode:tb-rl;
  -webkit-writing-mode:vertical-rl;
  writing-mode:vertical-rl;
}

:root:lang(mn-Mong){
  -ms-writing-mode:tb;
  -webkit-writing-mode:vertical-lr;
  writing-mode:vertical-lr;
}

body{
  width:100%;
  max-height:var(--RS__defaultLineLength) !important;
  margin:auto 0 !important;
  box-sizing:border-box;
}

:root:not([style*="readium-scroll-on"]) body{
  padding:var(--RS__pageGutter) 0 !important;
}

:root:not([style*="readium-noOverflow-on"]) body{
  overflow:hidden;
}

@supports (overflow: clip){

  :root:not([style*="readium-noOverflow-on"]){
     overflow:clip;
  }

  :root:not([style*="readium-noOverflow-on"]) body{
     overflow:clip;
     overflow-clip-margin:content-box;
  }
}

:root[style*="readium-scroll-on"],
:root[style*="readium-noVerticalPagination-on"]{
  -webkit-columns:auto auto !important;
  -moz-columns:auto auto !important;
  columns:auto auto !important;
  width:auto !important;
  max-width:none !important;
  max-height:100vh !important;
  min-width:0 !important;
}

:root[style*="readium-scroll-on"] body,
:root[style*="readium-noVerticalPagination-on"] body{
  max-width:var(--RS__defaultLineLength) !important;
  box-sizing:border-box !important;
}

@supports (overflow: clip){

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]){
     overflow:auto;
  }

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
     overflow:clip;
  }
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingTop"] body{
  padding-top:var(--RS__scrollPaddingTop) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingBottom"] body{
  padding-bottom:var(--RS__scrollPaddingBottom) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingLeft"] body{
  padding-left:var(--RS__scrollPaddingLeft) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingRight"] body{
  padding-right:var(--RS__scrollPaddingRight) !important;
}

:root[style*="--USER__backgroundColor"]{
  background-color:var(--USER__backgroundColor) !important;
}

:root[style*="--USER__backgroundColor"] *{
  background-color:transparent !important;
}

:root[style*="--USER__textColor"]{
  color:var(--USER__textColor) !important;
}

:root[style*="--USER__textColor"] *:not(a){
  color:inherit !important;
  background-color:transparent !important;
  border-color:currentcolor !important;
}

:root[style*="--USER__textColor"] svg text{
  fill:currentcolor !important;
  stroke:none !important;
}

:root[style*="--USER__linkColor"] a:link,
:root[style*="--USER__linkColor"] a:link *{
  color:var(--USER__linkColor) !important;
}

:root[style*="--USER__visitedColor"] a:visited,
:root[style*="--USER__visitedColor"] a:visited *{
  color:var(--USER__visitedColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::-moz-selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__lineLength"] body{
    max-height:var(--USER__lineLength) !important;
  }

:root[style*="--USER__fontFamily"]{
  font-family:var(--USER__fontFamily) !important;
}

:root[style*="--USER__fontFamily"] *{
  font-family:revert !important;
}

:root:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] body{
  zoom:var(--USER__fontSize) !important;
}

:root:not([style*="readium-deprecatedFontSize-on"])[style*="readium-iOSPatch-on"][style*="--USER__fontSize"] body{
  -webkit-text-size-adjust:var(--USER__fontSize) !important;
}

@supports selector(figure:has(> img)){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> img),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> video),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> svg),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> canvas),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> iframe),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> audio),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> img:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> video:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> svg:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> canvas:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> iframe:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> audio:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] table{
    zoom:calc(100% / var(--USER__fontSize)) !important;
  }

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figcaption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] caption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] td,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] th{
    zoom:var(--USER__fontSize) !important;
  }
}

@supports not (zoom: 1){

  :root[style*="--USER__fontSize"]{
    font-size:var(--USER__fontSize) !important;
  }
}

:root[style*="readium-deprecatedFontSize-on"][style*="--USER__fontSize"]{
  font-size:var(--USER__fontSize) !important;
}

:root[style*="--USER__lineHeight"]{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__lineHeight"] body,
:root[style*="--USER__lineHeight"] p,
:root[style*="--USER__lineHeight"] li,
:root[style*="--USER__lineHeight"] div{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__paraSpacing"] p{
  margin-right:var(--USER__paraSpacing) !important;
  margin-left:var(--USER__paraSpacing) !important;
}

:root[style*="--USER__fontWeight"] body{
  font-weight:var(--USER__fontWeight) !important;
}

:root[style*="--USER__fontWeight"] b,
:root[style*="--USER__fontWeight"] strong{
  font-weight:bolder;
}

:root[style*="--USER__fontWidth"] body{
  font-stretch:var(--USER__fontWidth) !important;
}

:root[style*="--USER__fontOpticalSizing"] body{
  font-optical-sizing:var(--USER__fontOpticalSizing) !important;
}

:root[style*="--USER__letterSpacing"] h1,
:root[style*="--USER__letterSpacing"] h2,
:root[style*="--USER__letterSpacing"] h3,
:root[style*="--USER__letterSpacing"] h4,
:root[style*="--USER__letterSpacing"] h5,
:root[style*="--USER__letterSpacing"] h6,
:root[style*="--USER__letterSpacing"] p,
:root[style*="--USER__letterSpacing"] li,
:root[style*="--USER__letterSpacing"] div,
:root[style*="--USER__letterSpacing"] dt,
:root[style*="--USER__letterSpacing"] dd{
  letter-spacing:var(--USER__letterSpacing) !important;
  font-variant:none !important;
}

:root[style*="readium-noRuby-on"] body rt,
:root[style*="readium-noRuby-on"] body rp{
  display:none;
}

:root[style*="readium-blend-on"] svg,
:root[style*="readium-blend-on"] img{
  background-color:transparent !important;
  mix-blend-mode:multiply !important;
}

:root[style*="--USER__darkenImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) !important;
  filter:brightness(var(--USER__darkenImages)) !important;
}

:root[style*="readium-darken-on"] img{
  -webkit-filter:brightness(80%) !important;
  filter:brightness(80%) !important;
}

:root[style*="--USER__invertImages"] img{
  -webkit-filter:invert(var(--USER__invertImages)) !important;
  filter:invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-invert-on"] img{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="--USER__darkenImages"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
  filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-darken-on"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(80%) invert(var(--USER__invertImages)) !important;
  filter:brightness(80%) invert(var(--USER__invertImages)) !important;
}

:root[style*="--USER__darkenImages"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
  filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
}

:root[style*="readium-darken-on"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(80%) invert(100%) !important;
  filter:brightness(80%) invert(100%) !important;
}

:root[style*="--USER__invertGaiji"] img[class*="gaiji"]{
  -webkit-filter:invert(var(--USER__invertGaiji)) !important;
  filter:invert(var(--USER__invertGaiji)) !important;
}

:root[style*="readium-invertGaiji-on"] img[class*="gaiji"]{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="readium-normalize-on"]{
  --USER__typeScale:1.2;
}

:root[style*="readium-normalize-on"] p,
:root[style*="readium-normalize-on"] li,
:root[style*="readium-normalize-on"] div,
:root[style*="readium-normalize-on"] pre,
:root[style*="readium-normalize-on"] dd{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] h1{
  font-size:1.75rem !important;
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h2{
  font-size:1.5rem !important;
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h3{
  font-size:1.25rem !important;
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h4,
:root[style*="readium-normalize-on"] h5,
:root[style*="readium-normalize-on"] h6{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] small{
  font-size:smaller !important;
}

:root[style*="readium-normalize-on"] sub,
:root[style*="readium-normalize-on"] sup{
  font-size:67.5% !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h1{
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h2{
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h3{
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-iPadOSPatch-on"] body{
  -webkit-text-size-adjust:none;
}

:root[style*="readium-iPadOSPatch-on"] p, 
:root[style*="readium-iPadOSPatch-on"] h1, 
:root[style*="readium-iPadOSPatch-on"] h2, 
:root[style*="readium-iPadOSPatch-on"] h3, 
:root[style*="readium-iPadOSPatch-on"] h4, 
:root[style*="readium-iPadOSPatch-on"] h5, 
:root[style*="readium-iPadOSPatch-on"] h6, 
:root[style*="readium-iPadOSPatch-on"] li, 
:root[style*="readium-iPadOSPatch-on"] th, 
:root[style*="readium-iPadOSPatch-on"] td, 
:root[style*="readium-iPadOSPatch-on"] dt, 
:root[style*="readium-iPadOSPatch-on"] dd, 
:root[style*="readium-iPadOSPatch-on"] pre, 
:root[style*="readium-iPadOSPatch-on"] address, 
:root[style*="readium-iPadOSPatch-on"] details, 
:root[style*="readium-iPadOSPatch-on"] summary,
:root[style*="readium-iPadOSPatch-on"] figcaption,
:root[style*="readium-iPadOSPatch-on"] div:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)),
:root[style*="readium-iPadOSPatch-on"] aside:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)){
  -webkit-text-zoom:reset;
}

:root[style*="readium-iPadOSPatch-on"] abbr, 
:root[style*="readium-iPadOSPatch-on"] b, 
:root[style*="readium-iPadOSPatch-on"] bdi, 
:root[style*="readium-iPadOSPatch-on"] bdo, 
:root[style*="readium-iPadOSPatch-on"] cite, 
:root[style*="readium-iPadOSPatch-on"] code, 
:root[style*="readium-iPadOSPatch-on"] dfn, 
:root[style*="readium-iPadOSPatch-on"] em, 
:root[style*="readium-iPadOSPatch-on"] i, 
:root[style*="readium-iPadOSPatch-on"] kbd, 
:root[style*="readium-iPadOSPatch-on"] mark, 
:root[style*="readium-iPadOSPatch-on"] q, 
:root[style*="readium-iPadOSPatch-on"] rp, 
:root[style*="readium-iPadOSPatch-on"] rt, 
:root[style*="readium-iPadOSPatch-on"] ruby, 
:root[style*="readium-iPadOSPatch-on"] s, 
:root[style*="readium-iPadOSPatch-on"] samp, 
:root[style*="readium-iPadOSPatch-on"] small, 
:root[style*="readium-iPadOSPatch-on"] span, 
:root[style*="readium-iPadOSPatch-on"] strong, 
:root[style*="readium-iPadOSPatch-on"] sub, 
:root[style*="readium-iPadOSPatch-on"] sup, 
:root[style*="readium-iPadOSPatch-on"] time, 
:root[style*="readium-iPadOSPatch-on"] u, 
:root[style*="readium-iPadOSPatch-on"] var{
  -webkit-text-zoom:normal;
}

:root[style*="readium-iPadOSPatch-on"] p:not(:has(b, cite, em, i, q, s, small, span, strong)):first-line{
  -webkit-text-zoom:normal;
}`},Symbol.toStringTag,{value:"Module"})),Uh=Object.freeze(Object.defineProperty({__proto__:null,default:`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017–2026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickaël Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

@-ms-viewport{
  width:device-width;
}

@viewport{
  width:device-width;
  zoom:1;
}

:root{

  --RS__sans-serif-ja-v:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDGothic', 'Yu Gothic', 'ＭＳゴシック', 'MS Gothic', sans-serif;

  --RS__serif-ja-v:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDMincho', 'Yu Mincho', 'ＭＳ明朝', 'MS Mincho', serif;

  --RS__sans-serif-ja:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDPGothic', 'Yu Gothic', 'ＭＳ Ｐゴシック', 'MS PGothic', sans-serif;

  --RS__serif-ja:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDPMincho', 'Yu Mincho', 'ＭＳ Ｐ明朝', 'MS PMincho', serif;

  --RS__monospaceTf:ui-monospace, 'Andale Mono', 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;

  --RS__humanistTf:Seravek, Calibri, 'Gill Sans Nova', Roboto, Ubuntu, 'DejaVu Sans', source-sans-pro, sans-serif;

  --RS__sansTf:-ui-sans-serif, -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Liberation Sans', Arial, sans-serif;

  --RS__modernTf:Athelas, Constantia, Charter, 'Bitstream Charter', Cambria, 'Georgia Pro', Georgia, serif;

  --RS__oldStyleTf:'Iowan Old Style', Sitka, 'Sitka Text', Palatino, 'Book Antiqua', 'URW Palladio L', P052, serif;

  --RS__zh-HK-lineHeightCompensation:1.167;

  --RS__zh-HK-baseFontFamily:'方體', 'PingFang HK', '方體', 'PingFang TC', '黑體', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-TW-lineHeightCompensation:1.167;

  --RS__zh-TW-baseFontFamily:'方體', 'PingFang TC', '黑體', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-Hant-lineHeightCompensation:1.167;

  --RS__zh-Hant-baseFontFamily:'方體', 'PingFang TC', '黑體', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-lineHeightCompensation:1.167;

  --RS__zh-baseFontFamily:'方体', 'PingFang SC', '黑体', 'Heiti SC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK SC', sans-serif;

  --RS__th-lineHeightCompensation:1.067;

  --RS__th-baseFontFamily:Thonburi, 'Leelawadee UI', 'Cordia New', Roboto, Noto, 'Noto Sans Thai', sans-serif;

  --RS__te-baseFontFamily:'Kohinoor Telugu', 'Telugu Sangam MN', 'Nirmala UI', Gautami, Roboto, Noto, 'Noto Sans Telugu', sans-serif;

  --RS__ta-lineHeightCompensation:1.067;

  --RS__ta-baseFontFamily:'Tamil Sangam MN', 'Nirmala UI', Latha, Roboto, Noto, 'Noto Sans Tamil', sans-serif;

  --RS__si-lineHeightCompensation:1.167;

  --RS__si-baseFontFamily:'Sinhala Sangam MN', 'Nirmala UI', 'Iskoola Pota', Roboto, Noto, 'Noto Sans Sinhala', sans-serif;

  --RS__pa-lineHeightCompensation:1.1;

  --RS__pa-baseFontFamily:'Gurmukhi MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Gurmukhi', sans-serif;

  --RS__or-lineHeightCompensation:1.167;

  --RS__or-baseFontFamily:'Oriya Sangam MN', 'Nirmala UI', Kalinga, Roboto, Noto, 'Noto Sans Oriya', sans-serif;

  --RS__ml-lineHeightCompensation:1.067;

  --RS__ml-baseFontFamily:'Malayalam Sangam MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Malayalam', sans-serif;

  --RS__lo-baseFontFamily:'Lao Sangam MN', 'Leelawadee UI', 'Lao UI', Roboto, Noto, 'Noto Sans Lao', sans-serif;

  --RS__ko-lineHeightCompensation:1.167;

  --RS__ko-baseFontFamily:'Nanum Gothic', 'Apple SD Gothic Neo', 'Malgun Gothic', Roboto, Noto, 'Noto Sans CJK KR', sans-serif;

  --RS__kn-lineHeightCompensation:1.1;

  --RS__kn-baseFontFamily:'Kannada Sangam MN', 'Nirmala UI', Tunga, Roboto, Noto, 'Noto Sans Kannada', sans-serif;

  --RS__km-lineHeightCompensation:1.067;

  --RS__km-baseFontFamily:'Khmer Sangam MN', 'Leelawadee UI', 'Khmer UI', Roboto, Noto, 'Noto Sans Khmer', sans-serif;

  --RS__ja-lineHeightCompensation:1.167;

  --RS__ja-baseFontFamily:YuGothic, 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo UI', 'MS Gothic', Roboto, Noto, 'Noto Sans CJK JP', sans-serif;

  --RS__iu-baseFontFamily:'Euphemia UCAS', Euphemia, Roboto, Noto, 'Noto Sans Canadian Aboriginal', sans-serif;

  --RS__hy-baseFontFamily:Mshtakan, Sylfaen, Roboto, Noto, 'Noto Serif Armenian', serif;

  --RS__hi-lineHeightCompensation:1.1;

  --RS__hi-baseFontFamily:'Kohinoor Devanagari', 'Devanagari Sangam MN', Kokila, 'Nirmala UI', Roboto, Noto, 'Noto Sans Devanagari', sans-serif;

  --RS__he-lineHeightCompensation:1.1;

  --RS__he-baseFontFamily:'New Peninim MT', 'Arial Hebrew', Gisha, 'Times New Roman', Roboto, Noto, 'Noto Sans Hebrew', sans-serif;

  --RS__gu-lineHeightCompensation:1.167;

  --RS__gu-baseFontFamily:'Gujarati Sangam MN', 'Nirmala UI', Shruti, Roboto, Noto, 'Noto Sans Gujarati', sans-serif;

  --RS__fa-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__chr-lineHeightCompensation:1.167;

  --RS__chr-baseFontFamily:'Plantagenet Cherokee', Roboto, Noto, 'Noto Sans Cherokee';

  --RS__bo-baseFontFamily:Kailasa, 'Microsoft Himalaya', Roboto, Noto, 'Noto Sans Tibetan', sans-serif;

  --RS__bn-lineHeightCompensation:1.067;

  --RS__bn-baseFontFamily:'Kohinoor Bangla', 'Bangla Sangam MN', Vrinda, Roboto, Noto, 'Noto Sans Bengali', sans-serif;

  --RS__ar-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__am-lineHeightCompensation:1.167;

  --RS__am-baseFontFamily:Kefa, Nyala, Roboto, Noto, 'Noto Sans Ethiopic', serif;

  --RS__latin-lineHeightCompensation:1;

  --RS__latin-baseFontFamily:var(--RS__oldStyleTf);
  --RS__baseFontFamily:var(--RS__latin-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__latin-lineHeightCompensation);
  --RS__baseLineHeight:calc(1.5 * var(--RS__lineHeightCompensation));

  --RS__selectionTextColor:inherit;

  --RS__selectionBackgroundColor:#b4d8fe;

  --RS__visitedColor:#551A8B;

  --RS__linkColor:#0000EE;

  --RS__textColor:#121212;

  --RS__backgroundColor:#FFFFFF;
  color:var(--RS__textColor) !important;

  background-color:var(--RS__backgroundColor) !important;
}

::-moz-selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

::selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

html{
  font-family:var(--RS__baseFontFamily);
  line-height:1.6;
  line-height:var(--RS__baseLineHeight);
  text-rendering:optimizelegibility;
}

h1, h2, h3{
  line-height:normal;
}

:lang(ja),
:lang(zh),
:lang(ko){
  word-wrap:break-word;
  -webkit-line-break:strict;
  -epub-line-break:strict;
  line-break:strict;
}

math{
  font-family:"Latin Modern Math", "STIX Two Math", "XITS Math", "STIX Math", "Libertinus Math", "TeX Gyre Termes Math", "TeX Gyre Bonum Math", "TeX Gyre Schola", "DejaVu Math TeX Gyre", "TeX Gyre Pagella Math", "Asana Math", "Cambria Math", "Lucida Bright Math", "Minion Math", STIXGeneral, STIXSizeOneSym, Symbol, "Times New Roman", serif;
}

:lang(am){
  --RS__baseFontFamily:var(--RS__am-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__am-lineHeightCompensation);
}

:lang(ar){
  --RS__baseFontFamily:var(--RS__ar-baseFontFamily);
}

:lang(bn){
  --RS__baseFontFamily:var(--RS__bn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__bn-lineHeightCompensation);
}

:lang(bo){
  --RS__baseFontFamily:var(--RS__bo-baseFontFamily);
}

:lang(chr){
  --RS__baseFontFamily:var(--RS__chr-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__chr-lineHeightCompensation);
}

:lang(fa){
  --RS__baseFontFamily:var(--RS__fa-baseFontFamily);
}

:lang(gu){
  --RS__baseFontFamily:var(--RS__gu-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__gu-lineHeightCompensation);
}

:lang(he){
  --RS__baseFontFamily:var(--RS__he-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__he-lineHeightCompensation);
}

:lang(hi){
  --RS__baseFontFamily:var(--RS__hi-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__hi-lineHeightCompensation);
}

:lang(hy){
  --RS__baseFontFamily:var(--RS__hy-baseFontFamily);
}

:lang(iu){
  --RS__baseFontFamily:var(--RS__iu-baseFontFamily);
}

:lang(ja){
  --RS__baseFontFamily:var(--RS__ja-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ja-lineHeightCompensation);
}

:lang(km){
  --RS__baseFontFamily:var(--RS__km-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__km-lineHeightCompensation);
}

:lang(kn){
  --RS__baseFontFamily:var(--RS__kn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__kn-lineHeightCompensation);
}

:lang(ko){
  --RS__baseFontFamily:var(--RS__ko-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ko-lineHeightCompensation);
}

:lang(lo){
  --RS__baseFontFamily:var(--RS__lo-baseFontFamily);
}

:lang(ml){
  --RS__baseFontFamily:var(--RS__ml-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ml-lineHeightCompensation);
}

:lang(or){
  --RS__baseFontFamily:var(--RS__or-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__or-lineHeightCompensation);
}

:lang(pa){
  --RS__baseFontFamily:var(--RS__pa-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__pa-lineHeightCompensation);
}

:lang(si){
  --RS__baseFontFamily:var(--RS__si-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__si-lineHeightCompensation);
}

:lang(ta){
  --RS__baseFontFamily:var(--RS__ta-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ta-lineHeightCompensation);
}

:lang(te){
  --RS__baseFontFamily:var(--RS__te-baseFontFamily);
}

:lang(th){
  --RS__baseFontFamily:var(--RS__th-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__th-lineHeightCompensation);
}

:lang(zh){
  --RS__baseFontFamily:var(--RS__zh-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-lineHeightCompensation);
}

:lang(zh-Hant){
  --RS__baseFontFamily:var(--RS__zh-Hant-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-Hant-lineHeightCompensation);
}

:lang(zh-TW){
  --RS__baseFontFamily:var(--RS__zh-TW-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-TW-lineHeightCompensation);
}

:lang(zh-HK){
  --RS__baseFontFamily:var(--RS__zh-HK-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-HK-lineHeightCompensation);
}

body{
  widows:2;
  orphans:2;
}

figcaption, th, td{
  widows:1;
  orphans:1;
}

h2, h3, h4, h5, h6, dt,
hr, caption{
  -webkit-column-break-after:avoid;
  page-break-after:avoid;
  break-after:avoid;
}

h1, h2, h3, h4, h5, h6, dt,
figure, tr{
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

body{
  -webkit-hyphenate-character:"\\002D";
  -moz-hyphenate-character:"\\002D";
  -ms-hyphenate-character:"\\002D";
  hyphenate-character:"\\002D";
  -webkit-hyphenate-limit-lines:3;
  -ms-hyphenate-limit-lines:3;
  hyphenate-limit-lines:3;
}

h1, h2, h3, h4, h5, h6, dt,
figcaption, pre, caption, address,
center, code, var{
  -ms-hyphens:none;
  -moz-hyphens:none;
  -webkit-hyphens:none;
  -epub-hyphens:none;
  hyphens:none;
}

body{
  font-variant-numeric:oldstyle-nums proportional-nums;
}

:lang(ja) body,
:lang(zh) body,
:lang(ko) body{
  font-variant-numeric:lining-nums proportional-nums;
}

h1, h2, h3, h4, h5, h6, dt{
  font-variant-numeric:lining-nums proportional-nums;
}

table{
  font-variant-numeric:lining-nums tabular-nums;
}

code, var{
  font-variant-ligatures:none;
  font-variant-numeric:lining-nums tabular-nums slashed-zero;
}

rt{
  font-variant-east-asian:ruby;
}

:lang(ar){
  font-variant-ligatures:common-ligatures;
}

:lang(ko){
  font-kerning:normal;
}

hr{
  color:inherit;
  border-color:currentcolor;
}

table, th, td{
  border-color:currentcolor;
}

figure, blockquote{
  margin:1em 5%;
}

ul, ol{
  padding-left:5%;
}

dd{
  margin-left:5%;
}

pre{
  white-space:pre-wrap;
  -ms-tab-size:2;
  -moz-tab-size:2;
  -webkit-tab-size:2;
  tab-size:2;
}

abbr[title], acronym[title]{
  text-decoration:dotted underline;
}

nobr wbr{
  white-space:normal;
}

ruby > rt, ruby > rp{
  -webkit-user-select:none;
  -moz-user-select:none;
  -ms-user-select:none;
  user-select:none;
}

*:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)),
*:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)),
*:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)),
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) cite, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) dfn, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) em, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) i,
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) cite, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) dfn, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) em, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) i,
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) cite, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) dfn, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) em, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) i{
  font-style:normal;
}

:lang(ja) a,
:lang(zh) a,
:lang(ko) a{
  text-decoration:none;
}

:root{
  --RS__maxMediaWidth:100%;
  --RS__maxMediaHeight:95vh;
  --RS__boxSizingMedia:border-box;
  --RS__boxSizingTable:border-box;
}

a, a span, span a, h1, h2, h3, h4, h5, h6{
  word-wrap:break-word;
}

div{
  max-width:var(--RS__maxMediaWidth);
}

img, svg|svg, video{
  object-fit:contain;

  width:auto;
  height:auto;
  max-width:var(--RS__maxMediaWidth);
  max-height:var(--RS__maxMediaHeight) !important;
  box-sizing:var(--RS__boxSizingMedia);
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

@supports (zoom: 1) and (not ((-webkit-column-axis: horizontal) and (-webkit-column-progression: normal))){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] img,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] svg|svg,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] video{
    zoom:calc(100% / var(--USER__fontSize));
  }
}

audio{
    max-width:100%;
    -webkit-column-break-inside:avoid;
    page-break-inside:avoid;
    break-inside:avoid;
  }

table{
  max-width:var(--RS__maxMediaWidth);
  box-sizing:var(--RS__boxSizingTable);
}`},Symbol.toStringTag,{value:"Module"})),Ah=Object.freeze(Object.defineProperty({__proto__:null,default:`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017–2026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickaël Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{
  --RS__compFontFamily:var(--RS__baseFontFamily);
  --RS__codeFontFamily:var(--RS__monospaceTf);

  --RS__typeScale:1.125;
  --RS__baseFontSize:100%;

  --RS__flowSpacing:1.5rem;
  --RS__paraSpacing:0;
  --RS__paraIndent:1em;

  --RS__linkColor:#0000EE;
  --RS__visitedColor:#551A8B;

  --RS__primaryColor:;
  --RS__secondaryColor:;
}

body{
  font-size:var(--RS__baseFontSize);
}

h1, h2, h3, h4, h5, h6{
  font-family:var(--RS__compFontFamily);
}

blockquote, figure, p, pre,
aside, footer, form, hr{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
}

p{
  margin-top:var(--RS__paraSpacing);
  margin-bottom:var(--RS__paraSpacing);
  text-indent:var(--RS__paraIndent);
}

h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p,
hr + p{
  text-indent:0;
}

pre{
  font-family:var(--RS__codeFontFamily);
}

code, kbd, samp, tt{
  font-family:var(--RS__codeFontFamily);
}

sub, sup{
  position:relative;
  font-size:67.5%;
  line-height:1;
}

sub{
  bottom:-0.2ex;
}

sup{
  bottom:0;
}

:link{
  color:var(--RS__linkColor);
}

:visited{
  color:var(--RS__visitedColor);
}

h1{
  margin-top:calc(var(--RS__flowSpacing) * 2);
  margin-bottom:calc(var(--RS__flowSpacing) * 2);
  font-size:calc(((1em * var(--RS__typeScale)) * var(--RS__typeScale)) * var(--RS__typeScale));
}

h2{
  margin-top:calc(var(--RS__flowSpacing) * 2);
  margin-bottom:var(--RS__flowSpacing);
  font-size:calc((1em * var(--RS__typeScale)) * var(--RS__typeScale));
}

h3{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:calc(1em * var(--RS__typeScale));
}

h4{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:1em;
}

h5{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:1em;
  font-variant:small-caps;
}

h6{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:0;
  font-size:1em;
  text-transform:lowercase;
  font-variant:small-caps;
}

dl, ol, ul{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
}

table{
  margin:var(--RS__flowSpacing) 0;
  border:1px solid currentcolor;
  border-collapse:collapse;
  empty-cells:show;
}

thead, tbody, tfoot, table > tr{
  vertical-align:top;
}

th{
  text-align:left;
}

th, td{
  padding:4px;
  border:1px solid currentcolor;
}`},Symbol.toStringTag,{value:"Module"})),Hh=Object.freeze(Object.defineProperty({__proto__:null,default:`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017–2026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickaël Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{

  --RS__viewportWidth:100%;

  --RS__pageGutter:0;

  --RS__defaultLineLength:100%;

  --RS__colGap:0;

  --RS__colCount:1;

  --RS__colWidth:100vw;
}

@page{
  margin:0 !important;
}

:root{
  position:relative;

  -webkit-column-width:var(--RS__colWidth);
  -moz-column-width:var(--RS__colWidth);
  column-width:var(--RS__colWidth);
  -webkit-column-count:var(--RS__colCount);
  -moz-column-count:var(--RS__colCount);
  column-count:var(--RS__colCount);

  -webkit-column-gap:var(--RS__colGap);
  -moz-column-gap:var(--RS__colGap);
  column-gap:var(--RS__colGap);
  -moz-column-fill:auto;
  column-fill:auto;
  width:var(--RS__viewportWidth);
  height:100vh;
  max-width:var(--RS__viewportWidth);
  max-height:100vh;
  min-width:var(--RS__viewportWidth);
  min-height:100vh;
  padding:0 !important;
  margin:0 !important;
  font-size:1rem !important;
  box-sizing:border-box;
  -webkit-touch-callout:none;
}

body{
  width:100%;
  max-width:var(--RS__defaultLineLength) !important;
  margin:0 auto !important;
  box-sizing:border-box;
}

:root:not([style*="readium-scroll-on"]) body{
  padding:0 var(--RS__pageGutter) !important;
}

:root:not([style*="readium-noOverflow-on"]) body{
  overflow:hidden;
}

@supports (overflow: clip){

   :root:not([style*="readium-noOverflow-on"]){
      overflow:clip;
   }

   :root:not([style*="readium-noOverflow-on"]) body{
      overflow:clip;
      overflow-clip-margin:content-box;
   }
}

:root[style*="readium-scroll-on"]{
  -webkit-columns:auto auto !important;
  -moz-columns:auto auto !important;
  columns:auto auto !important;
  width:auto !important;
  height:auto !important;
  max-width:none !important;
  max-height:none !important;
  min-width:0 !important;
  min-height:0 !important;
}

:root[style*="readium-scroll-on"] body{
  max-width:var(--RS__defaultLineLength) !important;
  box-sizing:border-box !important;
}

:root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
  overflow:auto;
}

@supports (overflow: clip){

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]){
     overflow:auto;
  }

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
     overflow:clip;
  }
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingTop"] body{
  padding-top:var(--RS__scrollPaddingTop) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingBottom"] body{
  padding-bottom:var(--RS__scrollPaddingBottom) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingLeft"] body{
  padding-left:var(--RS__scrollPaddingLeft) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingRight"] body{
  padding-right:var(--RS__scrollPaddingRight) !important;
}

:root[style*="--USER__backgroundColor"]{
  background-color:var(--USER__backgroundColor) !important;
}

:root[style*="--USER__backgroundColor"] *{
  background-color:transparent !important;
}

:root[style*="--USER__textColor"]{
  color:var(--USER__textColor) !important;
}

:root[style*="--USER__textColor"] *:not(a){
  color:inherit !important;
  background-color:transparent !important;
  border-color:currentcolor !important;
}

:root[style*="--USER__textColor"] svg text{
  fill:currentcolor !important;
  stroke:none !important;
}

:root[style*="--USER__linkColor"] a:link,
:root[style*="--USER__linkColor"] a:link *{
  color:var(--USER__linkColor) !important;
}

:root[style*="--USER__visitedColor"] a:visited,
:root[style*="--USER__visitedColor"] a:visited *{
  color:var(--USER__visitedColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::-moz-selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__colCount"]{
  -webkit-column-count:var(--USER__colCount);
  -moz-column-count:var(--USER__colCount);
  column-count:var(--USER__colCount);

  --RS__colWidth:auto;
}

:root[style*="--USER__colCount: 0"],
:root[style*="--USER__colCount:0"]{
  -webkit-column-count:1;
  -moz-column-count:1;
  column-count:1;
}

:root[style*="--USER__colCount: 0"],
:root[style*="--USER__colCount:0"],
:root[style*="--USER__colCount: 1"],
:root[style*="--USER__colCount:1"]{
  --RS__colWidth:100vw;
}

:root[style*="--USER__lineLength"] body{
    max-width:var(--USER__lineLength) !important;
  }

:root[style*="--USER__textAlign"]{
  text-align:var(--USER__textAlign);
}

:root[style*="--USER__textAlign"] body,
:root[style*="--USER__textAlign"] p:not(
  blockquote p,
  figcaption p,
  header p,
  hgroup p,
  :root[style*="readium-experimentalHeaderFiltering-on"] p[class*="title"],
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > h1 + p,
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > p:has(+ h1)
),
:root[style*="--USER__textAlign"] li,
:root[style*="--USER__textAlign"] dd{
  text-align:var(--USER__textAlign) !important;
  -moz-text-align-last:auto !important;
  -epub-text-align-last:auto !important;
  text-align-last:auto !important;
}

:root[style*="--USER__bodyHyphens"]{
  -webkit-hyphens:var(--USER__bodyHyphens) !important;
  -moz-hyphens:var(--USER__bodyHyphens) !important;
  -ms-hyphens:var(--USER__bodyHyphens) !important;
  -epub-hyphens:var(--USER__bodyHyphens) !important;
  hyphens:var(--USER__bodyHyphens) !important;
}

:root[style*="--USER__bodyHyphens"] body,
:root[style*="--USER__bodyHyphens"] p,
:root[style*="--USER__bodyHyphens"] li,
:root[style*="--USER__bodyHyphens"] div,
:root[style*="--USER__bodyHyphens"] dd{
  -webkit-hyphens:var(--USER__bodyHyphens) !important;
  -moz-hyphens:var(--USER__bodyHyphens) !important;
  -ms-hyphens:var(--USER__bodyHyphens) !important;
  -epub-hyphens:var(--USER__bodyHyphens) !important;
  hyphens:var(--USER__bodyHyphens) !important;
}

:root[style*="--USER__fontFamily"]{
  font-family:var(--USER__fontFamily) !important;
}

:root[style*="--USER__fontFamily"] *{
  font-family:revert !important;
}

:root[style*="readium-a11y-on"]{
  font-style:normal !important;
  font-weight:normal !important;
}

:root[style*="readium-a11y-on"] body *:not(code):not(var):not(kbd):not(samp){
  font-family:inherit !important;
  font-style:inherit !important;
  font-weight:inherit !important;
}

:root[style*="readium-a11y-on"] body *:not(a){
  text-decoration:none !important;
}

:root[style*="readium-a11y-on"] body *{
  font-variant-caps:normal !important;
  font-variant-numeric:normal !important;
  font-variant-position:normal !important;
}

:root[style*="readium-a11y-on"] sup,
:root[style*="readium-a11y-on"] sub{
  font-size:1rem !important;
  vertical-align:baseline !important;
}

:root:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] body{
  zoom:var(--USER__fontSize) !important;
}

:root:not([style*="readium-deprecatedFontSize-on"])[style*="readium-iOSPatch-on"][style*="--USER__fontSize"] body{
  -webkit-text-size-adjust:var(--USER__fontSize) !important;
}

@supports selector(figure:has(> img)){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> img),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> video),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> svg),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> canvas),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> iframe),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> audio),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> img:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> video:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> svg:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> canvas:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> iframe:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> audio:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] table{
    zoom:calc(100% / var(--USER__fontSize)) !important;
  }

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figcaption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] caption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] td,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] th{
    zoom:var(--USER__fontSize) !important;
  }
}

@supports not (zoom: 1){

  :root[style*="--USER__fontSize"]{
    font-size:var(--USER__fontSize) !important;
  }
}

:root[style*="readium-deprecatedFontSize-on"][style*="--USER__fontSize"]{
  font-size:var(--USER__fontSize) !important;
}

:root[style*="--USER__lineHeight"]{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__lineHeight"] body,
:root[style*="--USER__lineHeight"] p,
:root[style*="--USER__lineHeight"] li,
:root[style*="--USER__lineHeight"] div{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__paraSpacing"] p{
  margin-top:var(--USER__paraSpacing) !important;
  margin-bottom:var(--USER__paraSpacing) !important;
}

:root[style*="--USER__paraIndent"] p:not(
  blockquote p,
  figcaption p,
  header p,
  hgroup p,
  :root[style*="readium-experimentalHeaderFiltering-on"] p[class*="title"],
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > h1 + p,
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > p:has(+ h1)
){
  text-indent:var(--USER__paraIndent) !important;
}

:root[style*="--USER__paraIndent"] p *{
  text-indent:0 !important;
}

:root[style*="--USER__wordSpacing"] h1,
:root[style*="--USER__wordSpacing"] h2,
:root[style*="--USER__wordSpacing"] h3,
:root[style*="--USER__wordSpacing"] h4,
:root[style*="--USER__wordSpacing"] h5,
:root[style*="--USER__wordSpacing"] h6,
:root[style*="--USER__wordSpacing"] p,
:root[style*="--USER__wordSpacing"] li,
:root[style*="--USER__wordSpacing"] div,
:root[style*="--USER__wordSpacing"] dt,
:root[style*="--USER__wordSpacing"] dd{
  word-spacing:var(--USER__wordSpacing) !important;
}

:root[style*="--USER__letterSpacing"] h1,
:root[style*="--USER__letterSpacing"] h2,
:root[style*="--USER__letterSpacing"] h3,
:root[style*="--USER__letterSpacing"] h4,
:root[style*="--USER__letterSpacing"] h5,
:root[style*="--USER__letterSpacing"] h6,
:root[style*="--USER__letterSpacing"] p,
:root[style*="--USER__letterSpacing"] li,
:root[style*="--USER__letterSpacing"] div,
:root[style*="--USER__letterSpacing"] dt,
:root[style*="--USER__letterSpacing"] dd{
  letter-spacing:var(--USER__letterSpacing) !important;
  font-variant:none !important;
}

:root[style*="--USER__ligatures"]{
  font-variant-ligatures:var(--USER__ligatures) !important;
}

:root[style*="--USER__ligatures"] *{
  font-variant-ligatures:inherit !important;
}

:root[style*="--USER__fontWeight"] body{
  font-weight:var(--USER__fontWeight) !important;
}

:root[style*="--USER__fontWeight"] b,
:root[style*="--USER__fontWeight"] strong{
  font-weight:bolder;
}

:root[style*="--USER__fontWidth"] body{
  font-stretch:var(--USER__fontWidth) !important;
}

:root[style*="--USER__fontOpticalSizing"] body{
  font-optical-sizing:var(--USER__fontOpticalSizing) !important;
}

:root[style*="readium-blend-on"] svg,
:root[style*="readium-blend-on"] img{
  background-color:transparent !important;
  mix-blend-mode:multiply !important;
}

:root[style*="--USER__darkenImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) !important;
  filter:brightness(var(--USER__darkenImages)) !important;
}

:root[style*="readium-darken-on"] img{
  -webkit-filter:brightness(80%) !important;
  filter:brightness(80%) !important;
}

:root[style*="--USER__invertImages"] img{
  -webkit-filter:invert(var(--USER__invertImages)) !important;
  filter:invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-invert-on"] img{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="--USER__darkenImages"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
  filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-darken-on"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(80%) invert(var(--USER__invertImages)) !important;
  filter:brightness(80%) invert(var(--USER__invertImages)) !important;
}

:root[style*="--USER__darkenImages"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
  filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
}

:root[style*="readium-darken-on"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(80%) invert(100%) !important;
  filter:brightness(80%) invert(100%) !important;
}

:root[style*="--USER__invertGaiji"] img[class*="gaiji"]{
  -webkit-filter:invert(var(--USER__invertGaiji)) !important;
  filter:invert(var(--USER__invertGaiji)) !important;
}

:root[style*="readium-invertGaiji-on"] img[class*="gaiji"]{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="readium-normalize-on"]{
  --USER__typeScale:1.2;
}

:root[style*="readium-normalize-on"] p,
:root[style*="readium-normalize-on"] li,
:root[style*="readium-normalize-on"] div,
:root[style*="readium-normalize-on"] pre,
:root[style*="readium-normalize-on"] dd{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] h1{
  font-size:1.75rem !important;
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h2{
  font-size:1.5rem !important;
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h3{
  font-size:1.25rem !important;
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h4,
:root[style*="readium-normalize-on"] h5,
:root[style*="readium-normalize-on"] h6{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] small{
  font-size:smaller !important;
}

:root[style*="readium-normalize-on"] sub,
:root[style*="readium-normalize-on"] sup{
  font-size:67.5% !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h1{
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h2{
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h3{
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-iPadOSPatch-on"] body{
  -webkit-text-size-adjust:none;
}

:root[style*="readium-iPadOSPatch-on"] p, 
:root[style*="readium-iPadOSPatch-on"] h1, 
:root[style*="readium-iPadOSPatch-on"] h2, 
:root[style*="readium-iPadOSPatch-on"] h3, 
:root[style*="readium-iPadOSPatch-on"] h4, 
:root[style*="readium-iPadOSPatch-on"] h5, 
:root[style*="readium-iPadOSPatch-on"] h6, 
:root[style*="readium-iPadOSPatch-on"] li, 
:root[style*="readium-iPadOSPatch-on"] th, 
:root[style*="readium-iPadOSPatch-on"] td, 
:root[style*="readium-iPadOSPatch-on"] dt, 
:root[style*="readium-iPadOSPatch-on"] dd, 
:root[style*="readium-iPadOSPatch-on"] pre, 
:root[style*="readium-iPadOSPatch-on"] address, 
:root[style*="readium-iPadOSPatch-on"] details, 
:root[style*="readium-iPadOSPatch-on"] summary,
:root[style*="readium-iPadOSPatch-on"] figcaption,
:root[style*="readium-iPadOSPatch-on"] div:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)),
:root[style*="readium-iPadOSPatch-on"] aside:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)){
  -webkit-text-zoom:reset;
}

:root[style*="readium-iPadOSPatch-on"] abbr, 
:root[style*="readium-iPadOSPatch-on"] b, 
:root[style*="readium-iPadOSPatch-on"] bdi, 
:root[style*="readium-iPadOSPatch-on"] bdo, 
:root[style*="readium-iPadOSPatch-on"] cite, 
:root[style*="readium-iPadOSPatch-on"] code, 
:root[style*="readium-iPadOSPatch-on"] dfn, 
:root[style*="readium-iPadOSPatch-on"] em, 
:root[style*="readium-iPadOSPatch-on"] i, 
:root[style*="readium-iPadOSPatch-on"] kbd, 
:root[style*="readium-iPadOSPatch-on"] mark, 
:root[style*="readium-iPadOSPatch-on"] q, 
:root[style*="readium-iPadOSPatch-on"] rp, 
:root[style*="readium-iPadOSPatch-on"] rt, 
:root[style*="readium-iPadOSPatch-on"] ruby, 
:root[style*="readium-iPadOSPatch-on"] s, 
:root[style*="readium-iPadOSPatch-on"] samp, 
:root[style*="readium-iPadOSPatch-on"] small, 
:root[style*="readium-iPadOSPatch-on"] span, 
:root[style*="readium-iPadOSPatch-on"] strong, 
:root[style*="readium-iPadOSPatch-on"] sub, 
:root[style*="readium-iPadOSPatch-on"] sup, 
:root[style*="readium-iPadOSPatch-on"] time, 
:root[style*="readium-iPadOSPatch-on"] u, 
:root[style*="readium-iPadOSPatch-on"] var{
  -webkit-text-zoom:normal;
}

:root[style*="readium-iPadOSPatch-on"] p:not(:has(b, cite, em, i, q, s, small, span, strong)):first-line{
  -webkit-text-zoom:normal;
}`},Symbol.toStringTag,{value:"Module"})),Ih=Object.freeze(Object.defineProperty({__proto__:null,default:`/* Readium CSS
   EBPAJ Fonts Patch module

   A stylesheet improving EBPAJ @font-face declarations to cover all platforms

   Repo: https://github.com/readium/css */

/* EBPAJ template only references fonts from MS Windows…
   so we must reference fonts from other platforms
   and override authors’ stylesheets.
   What we do there is keeping their default value and providing fallbacks.

   /!\\ /!\\ /!\\ /!\\ /!\\
   FYI, you might want to load this polyfill only if you find
   one of the following metadata items in the OPF package:
   - version 1:
     <dc:description id="ebpaj-guide">ebpaj-guide-1.0</dc:description>
   - version 1.1:
     <meta property="ebpaj:guide-version">1.1</meta>
*/

/* 
   Hiragino PostScript Font name lists:
   https://www.screen.co.jp/ga_product/sento/support/QA/ss_psname.html
*/

/* 横組み用 (horizontal writing) */

@font-face {
  font-family: "serif-ja";
  src: local("ＭＳ Ｐ明朝"), /* for IE */
      local("MS PMincho"), /* ＭＳ Ｐ明朝 */
      local("HiraMinProN-W3"), local("Hiragino Mincho ProN"), /* ヒラギノ明朝 ProN W3 */
      local("HiraMinPro-W3"), local("Hiragino Mincho Pro"), /* ヒラギノ明朝 Pro W3 */
      local("YuMin-Medium"), local("YuMincho"), /* 游明朝体(macOS) */
      local("Yu Mincho"), /* 游明朝(Windows) */
      local("BIZ UDPMincho"); /* BIZ UDP明朝 */
}

@font-face {
  font-family: "sans-serif-ja";
  src: local("ＭＳ Ｐゴシック"), /* for IE */
       local("MS PGothic"), /* ＭＳ Ｐゴシック */
       local("HiraginoSans-W3"), local("Hiragino Sans"), /* ヒラギノ角ゴシック */
       local("HiraKakuProN-W3"), local("Hiragino Kaku Gothic ProN"), /* ヒラギノ角ゴ ProN W3 */
       local("HiraKakuPro-W3"), local("Hiragino Kaku Gothic Pro"), /* ヒラギノ角ゴ Pro W3 */
       local("ヒラギノ角ゴ W3"), /* for old  Safari */
       local("HiraginoKaku-W3-90msp-RKSJ-H"), /* ヒラギノ角ゴ W3(TrueType) */
       local("YuGothic-Medium"), local("YuGothic"), /* 游ゴシック体(macOS) */
       local("Yu Gothic Medium"), local("Yu Gothic"), /* 游ゴシック(Windows) "Yu Gothic" is a fallback. */
       local("BIZ UDPGothic"); /* BIZ UDPゴシック */
}

/* 縦組み用 (vertical writing) */

@font-face {
  font-family: "serif-ja-v";
  src: local("ＭＳ 明朝"), /* for IE */
       local("MS Mincho"), /* ＭＳ 明朝 */
       local("HiraMinProN-W3"), local("Hiragino Mincho ProN"), /* ヒラギノ明朝 ProN W3 */
       local("HiraMinPro-W3"), local("Hiragino Mincho Pro"), /* ヒラギノ明朝 Pro W3 */
       local("YuMin-Medium"), local("YuMincho"), /* 游明朝体(macOS) */
       local("Yu Mincho"), /* 游明朝(Windows) */
       local("BIZ UDMincho"); /*  BIZ UD明朝 */
}

@font-face {
  font-family: "sans-serif-ja-v";
  src: local("ＭＳ ゴシック"), /* for IE */
       local("MS Gothic"), /* ＭＳ ゴシック */
       local("HiraginoSans-W3"), local("Hiragino Sans"), /* ヒラギノ角ゴシック */
       local("HiraKakuProN-W3"), local("Hiragino Kaku Gothic ProN"), /* ヒラギノ角ゴ ProN W3 */
       local("HiraKakuPro-W3"), local("Hiragino Kaku Gothic Pro"), /* ヒラギノ角ゴ Pro W3 */
       local("ヒラギノ角ゴ W3"), /* for old Safari */
       local("HiraKakuDS-W3-83pv-RKSJ-H"), /* ヒラギノ角ゴ W3(TrueType) */
       local("YuGothic-Medium"), local("YuGothic"), /* 游ゴシック体(macOS) */
       local("Yu Gothic Medium"), local("Yu Gothic"), /* 游ゴシック(Windows)  "Yu Gothic" is a fallback. */
       local("BIZ UDGothic"); /* BIZ UDゴシック */
}`},Symbol.toStringTag,{value:"Module"}));return ut.EpubNavigator=Si,ut.EpubPreferences=Fe,ut.HttpFetcher=cr,ut.Link=gt,ut.Locator=rt,ut.Manifest=es,ut.Publication=rs,Object.defineProperty(ut,Symbol.toStringTag,{value:"Module"}),ut})({});
