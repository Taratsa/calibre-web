var Readium=(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});var t=Object.defineProperty,n=(e,t,n)=>()=>{if(n)throw n[0];try{return e&&(t=e(e=0)),t}catch(e){throw n=[e],e}},r=(e,n)=>{let r={};for(var i in e)t(r,i,{get:e[i],enumerable:!0});return n||t(r,Symbol.toStringTag,{value:`Module`}),r},i=class{close(){}links(){return[]}get(e){throw Error(`This is an empty fetcher`)}},a=class{constructor(e,t){this.client=e||window.fetch.bind(window),this.baseUrl=t}links(){return[]}get(e){let t=e.toURL(this.baseUrl);if(t===void 0)throw Error(`Invalid HREF: ${e.href}`);return new o(this.client,e,t)}close(){}},o=class{constructor(e,t,n){this.client=e||window.fetch.bind(window),this._link=t,this.url=n}async headResponse(){if(this._headResponse)return this._headResponse;let e=await this.client(this.url,{method:`HEAD`});if(!e.ok)throw Error(`http HEAD request for ${this.url} failed with HTTP status code ${e.status}`);return this._headResponse=e,e}close(){}async link(){return this._link}async read(e,t){if(e)throw Error(`http read range not implemented!`);let n=await this.client(this.url,t?.signal?{signal:t.signal}:void 0);if(!n.ok)throw Error(`http GET request for ${this.url} failed with HTTP status code ${n.status}`);return new Uint8Array(await n.arrayBuffer())}async length(){let e=(await this.headResponse()).headers.get(`content-length`);if(e===null||e===``)throw Error(`length for resource unavailable`);return parseInt(e)}async readAsJSON(){let e=await this.client(this.url);if(!e.ok)throw Error(`http GET request for ${this.url} failed with HTTP status code ${e.status}`);return await e.json()}async readAsString(){let e=await this.client(this.url);if(!e.ok)throw Error(`http GET request for ${this.url} failed with HTTP status code ${e.status}`);return await e.text()}async readAsXML(){let e=await this.client(this.url);if(!e.ok)throw Error(`http GET request for ${this.url} failed with HTTP status code ${e.status}`);return new DOMParser().parseFromString(await e.text(),this._link.mediaType.isHTML?this._link.mediaType.essence:`text/xml`)}};function s(e){return e&&Array.isArray(e)?e:void 0}function c(e){return e&&typeof e==`string`?[e]:s(e)}function l(e){return typeof e==`string`?new Date(e):void 0}function u(e){return isNaN(e)?void 0:e}function d(e){return u(e)!==void 0&&Math.sign(e)>=0?e:void 0}function f(e){let t=[];return e.forEach(e=>t.push(e)),t}var p=class e{constructor(e={}){this.conformsTo=e.conformsTo??[],this.certification=e.certification??null,this.summary=e.summary??null,this.accessMode=e.accessMode??[],this.accessModeSufficient=e.accessModeSufficient??[],this.feature=e.feature??[],this.hazard=e.hazard??[],this.exemption=e.exemption??[]}static deserialize(t){if(!t||typeof t!=`object`)return;let n=t,r=c(n.conformsTo),i=c(n.accessMode),a=s(n.accessModeSufficient),o=c(n.feature),l=c(n.hazard),u=c(n.exemption);return new e({conformsTo:r?r.map(e=>h.deserialize(e)).filter(e=>e!==void 0):void 0,certification:n.certification?g.deserialize(n.certification):void 0,summary:n.summary,accessMode:i?i.map(e=>ee.deserialize(e)).filter(e=>e!==void 0):void 0,accessModeSufficient:a?a.map(e=>te.deserialize(e)).filter(e=>e!==void 0):void 0,feature:o?o.map(e=>ne.deserialize(e)).filter(e=>e!==void 0):void 0,hazard:l?l.map(e=>re.deserialize(e)).filter(e=>e!==void 0):void 0,exemption:u?u.map(e=>ie.deserialize(e)).filter(e=>e!==void 0):void 0})}serialize(){let e={};return this.conformsTo?.length>0&&(e.conformsTo=this.conformsTo.map(e=>e.serialize())),this.certification!==void 0&&this.certification!==null&&(e.certification=this.certification.serialize()),this.summary!==void 0&&this.summary!==null&&(e.summary=this.summary),this.accessMode?.length>0&&(e.accessMode=this.accessMode.map(e=>e.serialize())),this.accessModeSufficient?.length>0&&(e.accessModeSufficient=this.accessModeSufficient.map(e=>e.serialize())),this.feature?.length>0&&(e.feature=this.feature.map(e=>e.serialize())),this.hazard?.length>0&&(e.hazard=this.hazard.map(e=>e.serialize())),this.exemption?.length>0&&(e.exemption=this.exemption.map(e=>e.serialize())),e}},m=class e{constructor(e){this.uri=e}static deserialize(t){if(t&&typeof t==`string`)return new e(t)}serialize(){return this.uri}get isWCAGLevelA(){return this===e.EPUB_A11Y_10_WCAG_20_A||this===e.EPUB_A11Y_11_WCAG_20_A||this===e.EPUB_A11Y_11_WCAG_21_A||this===e.EPUB_A11Y_11_WCAG_22_A}get isWCAGLevelAA(){return this===e.EPUB_A11Y_10_WCAG_20_AA||this===e.EPUB_A11Y_11_WCAG_20_AA||this===e.EPUB_A11Y_11_WCAG_21_AA||this===e.EPUB_A11Y_11_WCAG_22_AA}get isWCAGLevelAAA(){return this===e.EPUB_A11Y_10_WCAG_20_AAA||this===e.EPUB_A11Y_11_WCAG_20_AAA||this===e.EPUB_A11Y_11_WCAG_21_AAA||this===e.EPUB_A11Y_11_WCAG_22_AAA}};m.EPUB_A11Y_10_WCAG_20_A=new m(`http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-a`),m.EPUB_A11Y_10_WCAG_20_AA=new m(`http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aa`),m.EPUB_A11Y_10_WCAG_20_AAA=new m(`http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aaa`),m.EPUB_A11Y_11_WCAG_20_A=new m(`https://www.w3.org/TR/epub-a11y-11#wcag-2.0-a`),m.EPUB_A11Y_11_WCAG_20_AA=new m(`https://www.w3.org/TR/epub-a11y-11#wcag-2.0-aa`),m.EPUB_A11Y_11_WCAG_20_AAA=new m(`https://www.w3.org/TR/epub-a11y-11#wcag-2.0-aaa`),m.EPUB_A11Y_11_WCAG_21_A=new m(`https://www.w3.org/TR/epub-a11y-11#wcag-2.1-a`),m.EPUB_A11Y_11_WCAG_21_AA=new m(`https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aa`),m.EPUB_A11Y_11_WCAG_21_AAA=new m(`https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aaa`),m.EPUB_A11Y_11_WCAG_22_A=new m(`https://www.w3.org/TR/epub-a11y-11#wcag-2.2-a`),m.EPUB_A11Y_11_WCAG_22_AA=new m(`https://www.w3.org/TR/epub-a11y-11#wcag-2.2-aa`),m.EPUB_A11Y_11_WCAG_22_AAA=new m(`https://www.w3.org/TR/epub-a11y-11#wcag-2.2-aaa`);var h=m,g=class e{constructor(e=null,t=null,n=null){this.certifiedBy=e,this.credential=t,this.report=n}static deserialize(t){if(t&&typeof t==`object`)return new e(t.certifiedBy,t.credential,t.report)}serialize(){let e={};return this.certifiedBy&&(e.certifiedBy=this.certifiedBy),this.credential&&(e.credential=this.credential),this.report&&(e.report=this.report),e}},_=class e{constructor(e){this.value=e}static deserialize(t){if(t&&typeof t==`string`)return new e(t)}serialize(){return this.value}};_.AUDITORY=new _(`auditory`),_.CHART_ON_VISUAL=new _(`chartOnVisual`),_.CHEM_ON_VISUAL=new _(`chemOnVisual`),_.COLOR_DEPENDENT=new _(`colorDependent`),_.DIAGRAM_ON_VISUAL=new _(`diagramOnVisual`),_.MATH_ON_VISUAL=new _(`mathOnVisual`),_.MUSIC_ON_VISUAL=new _(`musicOnVisual`),_.TACTILE=new _(`tactile`),_.TEXT_ON_VISUAL=new _(`textOnVisual`),_.TEXTUAL=new _(`textual`),_.VISUAL=new _(`visual`);var ee=_,v=class e{constructor(t){if(typeof t==`string`){if(!e.VALID_MODES.has(t.toLowerCase()))return;this.value=t.toLowerCase()}else{let n=t.filter(t=>e.VALID_MODES.has(t.toLowerCase()));if(n.length===0)return;this.value=Array.from(new Set(n))}}static deserialize(t){if(!t)return;if(typeof t==`string`)return e.VALID_MODES.has(t.toLowerCase())?new e(t):void 0;if(!Array.isArray(t))return;let n=t.filter(t=>t?e.VALID_MODES.has(t.toLowerCase()):!1);if(n.length!==0)return new e(n)}serialize(){return this.value}};v.VALID_MODES=new Set([`auditory`,`tactile`,`textual`,`visual`]),v.AUDITORY=new v(`auditory`),v.TACTILE=new v(`tactile`),v.TEXTUAL=new v(`textual`),v.VISUAL=new v(`visual`);var te=v,y=class e{constructor(e){this.value=e}static deserialize(t){if(t&&typeof t==`string`)return new e(t)}serialize(){return this.value}};y.NONE=new y(`none`),y.ANNOTATIONS=new y(`annotations`),y.ARIA=new y(`ARIA`),y.INDEX=new y(`index`),y.PAGE_BREAK_MARKERS=new y(`pageBreakMarkers`),y.PAGE_NAVIGATION=new y(`pageNavigation`),y.PRINT_PAGE_NUMBERS=new y(`printPageNumbers`),y.READING_ORDER=new y(`readingOrder`),y.STRUCTURAL_NAVIGATION=new y(`structuralNavigation`),y.TABLE_OF_CONTENTS=new y(`tableOfContents`),y.TAGGED_PDF=new y(`taggedPDF`),y.ALTERNATIVE_TEXT=new y(`alternativeText`),y.AUDIO_DESCRIPTION=new y(`audioDescription`),y.CAPTIONS=new y(`captions`),y.CLOSED_CAPTIONS=new y(`closedCaptions`),y.DESCRIBED_MATH=new y(`describedMath`),y.LONG_DESCRIPTION=new y(`longDescription`),y.OPEN_CAPTIONS=new y(`openCaptions`),y.SIGN_LANGUAGE=new y(`signLanguage`),y.TRANSCRIPT=new y(`transcript`),y.DISPLAY_TRANSFORMABILITY=new y(`displayTransformability`),y.SYNCHRONIZED_AUDIO_TEXT=new y(`synchronizedAudioText`),y.TIMING_CONTROL=new y(`timingControl`),y.UNLOCKED=new y(`unlocked`),y.CHEM_ML=new y(`ChemML`),y.LATEX=new y(`latex`),y.LATEX_CHEMISTRY=new y(`latex-chemistry`),y.MATH_ML=new y(`MathML`),y.MATH_ML_CHEMISTRY=new y(`MathML-chemistry`),y.TTS_MARKUP=new y(`ttsMarkup`),y.HIGH_CONTRAST_AUDIO=new y(`highContrastAudio`),y.HIGH_CONTRAST_DISPLAY=new y(`highContrastDisplay`),y.LARGE_PRINT=new y(`largePrint`),y.BRAILLE=new y(`braille`),y.TACTILE_GRAPHIC=new y(`tactileGraphic`),y.TACTILE_OBJECT=new y(`tactileObject`),y.FULL_RUBY_ANNOTATIONS=new y(`fullRubyAnnotations`),y.HORIZONTAL_WRITING=new y(`horizontalWriting`),y.RUBY_ANNOTATIONS=new y(`rubyAnnotations`),y.VERTICAL_WRITING=new y(`verticalWriting`),y.WITH_ADDITIONAL_WORD_SEGMENTATION=new y(`withAdditionalWordSegmentation`),y.WITHOUT_ADDITIONAL_WORD_SEGMENTATION=new y(`withoutAdditionalWordSegmentation`);var ne=y,b=class e{constructor(e){this.value=e}static deserialize(t){if(t&&typeof t==`string`)return new e(t)}serialize(){return this.value}};b.FLASHING=new b(`flashing`),b.NO_FLASHING_HAZARD=new b(`noFlashingHazard`),b.UNKNOWN_FLASHING_HAZARD=new b(`unknownFlashingHazard`),b.MOTION_SIMULATION=new b(`motionSimulation`),b.NO_MOTION_SIMULATION_HAZARD=new b(`noMotionSimulationHazard`),b.UNKNOWN_MOTION_SIMULATION_HAZARD=new b(`unknownMotionSimulationHazard`),b.SOUND=new b(`sound`),b.NO_SOUND_HAZARD=new b(`noSoundHazard`),b.UNKNOWN_SOUND_HAZARD=new b(`unknownSoundHazard`),b.UNKNOWN=new b(`unknown`),b.NONE=new b(`none`);var re=b,x=class e{constructor(e){this.value=e}static deserialize(t){if(t&&typeof t==`string`)return new e(t)}serialize(){return this.value}};x.NONE=new x(`none`),x.DOCUMENTED=new x(`documented`),x.LEGAL=new x(`legal`),x.TEMPORARY=new x(`temporary`),x.TECHNICAL=new x(`technical`),x.EAA_DISPROPORTIONATE_BURDEN=new x(`eaa-disproportionate-burden`),x.EAA_FUNDAMENTAL_ALTERATION=new x(`eaa-fundamental-alteration`),x.EAA_MICROENTERPRISE=new x(`eaa-microenterprise`),x.EAA_TECHNICAL_IMPOSSIBILITY=new x(`eaa-technical-impossibility`),x.EAA_TEMPORARY=new x(`eaa-temporary`);var ie=x,S=(e=>(e.reflowable=`reflowable`,e.fixed=`fixed`,e.scrolled=`scrolled`,e))(S||{}),ae=class e{constructor(e){this.cssSelector=e.cssSelector,this.textNodeIndex=e.textNodeIndex,this.charOffset=e.charOffset}static deserialize(t){if(!(t&&t.cssSelector))return;let n=d(t.textNodeIndex);if(n===void 0)return;let r=d(t.charOffset);return r===void 0&&(r=d(t.offset)),new e({cssSelector:t.cssSelector,textNodeIndex:n,charOffset:r})}serialize(){let e={cssSelector:this.cssSelector,textNodeIndex:this.textNodeIndex};return this.charOffset!==void 0&&(e.charOffset=this.charOffset),e}},oe=class e{constructor(e){this.start=e.start,this.end=e.end}static deserialize(t){if(!t)return;let n=ae.deserialize(t.start);if(n)return new e({start:n,end:ae.deserialize(t.end)})}serialize(){let e={start:this.start.serialize()};return this.end&&(e.end=this.end.serialize()),e}};function se(e){let t=e.split(`,`)[0].trim(),n=(t.toLowerCase().startsWith(`npt:`)?t.slice(4):t).split(`:`);if(n.length===1){let e=parseFloat(n[0]);return isNaN(e)?void 0:e}if(n.length===2){let e=parseInt(n[0],10),t=parseFloat(n[1]);return isNaN(e)||isNaN(t)?void 0:e*60+t}if(n.length===3){let e=parseInt(n[0],10),t=parseInt(n[1],10),r=parseFloat(n[2]);return isNaN(e)||isNaN(t)||isNaN(r)?void 0:e*3600+t*60+r}}function ce(e){let t=se(e);return t!==void 0&&t===0}function le(e){let t=Math.floor(e),n=Math.floor(t/3600),r=Math.floor(t%3600/60),i=t%60,a=String(r).padStart(2,`0`),o=String(i).padStart(2,`0`);return n>0?`${n}:${a}:${o}`:`${r}:${o}`}var ue=null,de=null,fe=0,C={r:255,g:255,b:255,a:1},w=new Map,pe=()=>{if(!ue){if(typeof OffscreenCanvas<`u`)ue=new OffscreenCanvas(5,5),de=ue.getContext(`2d`,{willReadFrequently:!0,desynchronized:!0});else{let e=document.createElement(`canvas`);e.width=5,e.height=5,ue=e,de=e.getContext(`2d`,{willReadFrequently:!0,desynchronized:!0})}}return de},me=e=>{if(!e)return!0;let t=e.trim().toLowerCase();return t.startsWith(`var(`)||[`transparent`,`currentcolor`,`inherit`,`initial`,`revert`,`unset`,`revert-layer`].includes(t)?!0:[`linear-gradient`,`radial-gradient`,`conic-gradient`,`repeating-linear-gradient`,`repeating-radial-gradient`,`repeating-conic-gradient`].some(e=>t.includes(e))},he=(e,t)=>{console.warn(`[@readium/helpers] Could not parse color: "${e}". ${t} Falling back to ${JSON.stringify(C)} to compute contrast. Please use a CSS color value that can be computed to RGB(A).`)},T=(e,t=null)=>{let n=t?`${e}|${t}`:e,r=w.get(n);if(r!==void 0)return r??C;if(me(e))return he(e,`Unsupported color format or special value.`),w.set(n,null),C;let i=pe();if(!i)return he(e,`Could not get canvas context.`),w.set(n,null),C;try{fe===0&&i.clearRect(0,0,5,5);let r=fe%5,a=Math.floor(fe/5);i.clearRect(r,a,1,1),t&&(i.fillStyle=t,i.fillRect(r,a,1,1)),i.fillStyle=e,i.fillRect(r,a,1,1);let o=i.getImageData(r,a,1,1);fe=(fe+1)%25;let[s,c,l,u]=o.data;if(u===0)return he(e,`Fully transparent color.`),w.set(n,null),C;let d={r:s,g:c,b:l,a:u/255};return w.set(n,d),d}catch(t){return he(e,`Error: ${t instanceof Error?t.message:String(t)}`),w.set(n,null),C}},ge=e=>{let t=e/255;return t<=.03928?t/12.92:((t+.055)/1.055)**2.4},_e=e=>{let t=ge(e.r),n=ge(e.g),r=ge(e.b);return .2126*t+.7152*n+.0722*r},ve=(e,t)=>{let n=typeof e==`string`?T(e):e,r=typeof t==`string`?T(t):t,i=_e(n),a=_e(r),o=Math.max(i,a),s=Math.min(i,a);return(o+.05)/(s+.05)},ye=(e,t=null)=>{let n=T(e,t);return ve(n,{r:255,g:255,b:255,a:1})>ve(n,{r:0,g:0,b:0,a:1})},be=(e,t=null)=>ye(e,t)?`white`:`black`,xe=e=>{let t=e.a===void 0?1:e.a;return`rgba(${Math.round(e.r)}, ${Math.round(e.g)}, ${Math.round(e.b)}, ${t})`},Se=(e,t)=>({r:Math.min(255,e.r+(255-e.r)*t),g:Math.min(255,e.g+(255-e.g)*t),b:Math.min(255,e.b+(255-e.b)*t),a:e.a??1}),Ce=(e,t)=>({r:Math.max(0,e.r*(1-t)),g:Math.max(0,e.g*(1-t)),b:Math.max(0,e.b*(1-t)),a:e.a??1}),we=(e,t=null,n=3)=>{let r=T(e),i=t?T(t):{r:255,g:255,b:255,a:1},a=ve(r,i);if(a>=n)return e;let o=_e(i)<.5,s={...r,a:r.a??1},c=.1;for(let e=0;e<20&&(s=o?Se(s,c):Ce(s,c),a=ve(s,i),!(a>=n));e++);return xe(s)};function Te(e){return e.replace(/(?:%[0-9A-Fa-f]{2})+/g,e=>{try{return decodeURIComponent(e)}catch{return e}})}var Ee=()=>typeof navigator>`u`?``:navigator.userAgent||``,De=()=>typeof navigator>`u`?void 0:navigator.userAgentData||void 0,Oe=class{constructor(){let e=De(),t=Ee(),n=e=>(typeof e==`string`||typeof e==`number`)&&e?String(e).replace(/_/g,`.`).split(`.`).map(e=>parseInt(e)||0):[],r=(e=``)=>{if(!e)return[];let r=RegExp(`^.*`+e+`[ :\\/]?(\\d+([\\._]\\d+)*).*$`);return r.test(t)?n(t.replace(r,`$1`)):[]};this.OS=(e=>(/(macOS|Mac OS X)/.test(t)?(/\(iP(hone|od touch);/.test(t)&&(e.iOS=r(`CPU (?:iPhone )?OS `)),/\(iPad;/.test(t)?e.iOS=e.iPadOS=r(`CPU (?:iPhone )?OS `):/(macOS|Mac OS X) \d/.test(t)&&(document.ontouchend===void 0?e.macOS=r(`(?:macOS|Mac OS X) `):e.iOS=e.iPadOS=r())):/Windows( NT)? \d/.test(t)?e.Windows=(e=>e[0]!==6||!e[1]?e:e[1]===1?[7]:e[1]===2?[8]:[8,1])(r(`Windows(?: NT)?`)):/Android \d/.test(t)?e.Android=r(`Android`):/CrOS/.test(t)?e.ChromeOS=r():/X11;/.test(t)&&(e.Linux=r()),e))({}),e&&e.getHighEntropyValues([`architecture`,`model`,`platform`,`platformVersion`,`uaFullVersion`]).then(e=>(t=>{let r=e.platform,i=e.platformVersion;if(r&&i){if(/^i(OS|P(hone|od touch))$/.test(r))t.iOS=n(i);else if(/^iPad(OS)?$/.test(r))t.iOS=t.iPadOS=n(i);else if(/^(macOS|(Mac )?OS X|Mac(Intel)?)$/.test(r))document.ontouchend===void 0?t.macOS=n(i):t.iOS=t.iPadOS=n();else if(/^(Microsoft )?Windows$/.test(r))t.Windows=n(i);else if(/^(Google )?Android$/.test(r))t.Android=n(i);else if(/^((Google )?Chrome OS|CrOS)$/.test(r))t.ChromeOS=n(i);else if(/^(Linux|Ubuntu|X11)$/.test(r))t.Linux=n(i);else return;Object.keys(this.OS).forEach(e=>delete this.OS[e]),Object.assign(this.OS,t)}})({})),this.UA=(n=>{let i=!1;if(e&&Array.isArray(e.brands)){let t=e.brands.reduce((e,t)=>(e[t.brand]=[t.version*1],e),{});t[`Google Chrome`]?(i=!0,n.Blink=n.Chromium=t.Chromium||[],n.Chrome=t[`Google Chrome`]):t[`Microsoft Edge`]?(i=!0,n.Blink=n.Chromium=t.Chromium||[],n.Edge=t[`Microsoft Edge`]):t.Opera&&(i=!0,n.Blink=n.Chromium=t.Chromium||[],n.Opera=t.Opera)}return i||(/ Gecko\/\d/.test(t)?(n.Gecko=r(`rv`),/ Waterfox\/\d/.test(t)?n.Waterfox=r(`Waterfox`):/ Firefox\/\d/.test(t)&&(n.Firefox=r(`Firefox`))):/ Edge\/\d/.test(t)?(n.EdgeHTML=r(`Edge`),n.Edge=n.EdgeHTML):/ Chrom(ium|e)\/\d/.test(t)?(n.Blink=n.Chromium=(e=>e[0]?e:r(`Chrome`))(r(`Chromium`)),/ EdgA?\/\d/.test(t)?n.Edge=(e=>e[0]?e:r(`Edg`))(r(`EdgA`)):/ OPR\/\d/.test(t)?n.Opera=r(`OPR`):/ Vivaldi\/\d/.test(t)?n.Vivaldi=r(`Vivaldi`):/ Silk\/\d/.test(t)?n.Silk=r(`Silk`):/ UCBrowser\/\d/.test(t)?n.UCBrowser=r(`UCBrowser`):/ Phoebe\/\d/.test(t)?n.Phoebe=r(`Phoebe`):n.Chrome=(e=>e[0]?e:n.Chromium)(r(`Chrome`))):/ AppleWebKit\/\d/.test(t)?(n.WebKit=r(`AppleWebKit`),/ CriOS \d/.test(t)?n.Chrome=r(`CriOS`):/ FxiOS \d/.test(t)?n.Firefox=r(`FxiOS`):/ EdgiOS\/\d/.test(t)?n.Edge=r(`EdgiOS`):/ Version\/\d/.test(t)&&(n.Safari=r(`Version`))):/ Trident\/\d/.test(t)&&(n.Trident=r(`Trident`),n.InternetExplorer=(e=>e[0]?e:r(`MSIE`))(r(`rv`)))),/[\[; ]FB(AN|_IAB)\//.test(t)&&(n.Facebook=r(`FBAV`)),/ Line\/\d/.test(t)&&(n.LINE=r(`Line`)),n})({}),this.Env={get:()=>[this.OS,this.UA].reduce((e,t)=>{for(let n in t)t[n]&&e.push(n);return e},[])}}},ke=class extends Oe{get iOSRequest(){let e=De(),t=Ee();if(this.OS.iOS&&!this.OS.iPadOS)return`mobile`;if(this.OS.iPadOS)return/\(iPad;/.test(t)||e&&/^iPad(OS)?$/.test(e.platform)?`mobile`:`desktop`}},E=new Oe,D=new ke,Ae=`:~:text=`;function je(e){if(!e)return;let t=e.indexOf(Ae);if(t===-1)return;let n=e.slice(t+8).split(`&`)[0];if(n)try{let e=n.split(`,`),t={textStart:``};return e.length>1&&e[0].endsWith(`-`)&&(t.prefix=decodeURIComponent(e[0].slice(0,-1)),e=e.slice(1)),e.length>1&&e[e.length-1].startsWith(`-`)&&(t.suffix=decodeURIComponent(e[e.length-1].slice(1)),e=e.slice(0,-1)),e.length===0||e[0]===``?void 0:(t.textStart=decodeURIComponent(e[0]),e.length>1&&(t.textEnd=decodeURIComponent(e[1])),t)}catch{return}}var Me=`ADDRESS.ARTICLE.ASIDE.BLOCKQUOTE.BR.DETAILS.DIALOG.DD.DIV.DL.DT.FIELDSET.FIGCAPTION.FIGURE.FOOTER.FORM.H1.H2.H3.H4.H5.H6.HEADER.HGROUP.HR.LI.MAIN.NAV.OL.P.PRE.SECTION.TABLE.UL.TR.TH.TD.COLGROUP.COL.CAPTION.THEAD.TBODY.TFOOT`.split(`.`),Ne=/[\t-\r -#%-\*,-\/:;\?@\[-\]_\{\}\x85\xA0\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u1680\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2000-\u200A\u2010-\u2029\u202F-\u2043\u2045-\u2051\u2053-\u205F\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E44\u3000-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC9\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDF3C-\uDF3E]|\uD807[\uDC41-\uDC45\uDC70\uDC71]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/u,Pe=(e,t,n)=>{let r=[],i=t.createRange();for(i.selectNodeContents(n??t);!i.collapsed&&r.length<2;){let n;if(e.prefix){let r=Ke(e.prefix,i);if(r==null)break;Ie(i,r.startContainer,r.startOffset);let a=t.createRange();if(a.setStart(r.endContainer,r.endOffset),a.setEnd(i.endContainer,i.endOffset),Le(a),a.collapsed||(n=Ke(e.textStart,a),n==null))break;if(n.compareBoundaryPoints(Range.START_TO_START,a)!==0)continue}else{if(n=Ke(e.textStart,i),n==null)break;Ie(i,n.startContainer,n.startOffset)}if(e.textEnd){let a=t.createRange();a.setStart(n.endContainer,n.endOffset),a.setEnd(i.endContainer,i.endOffset);let o=!1;for(;!a.collapsed&&r.length<2;){let s=Ke(e.textEnd,a);if(s==null)break;if(Ie(a,s.startContainer,s.startOffset),n.setEnd(s.endContainer,s.endOffset),e.suffix){let a=Fe(e.suffix,n,i,t);if(a===O.NO_SUFFIX_MATCH)break;if(a===O.SUFFIX_MATCH){o=!0,r.push(n.cloneRange());continue}if(a===O.MISPLACED_SUFFIX)continue}else o=!0,r.push(n.cloneRange())}if(!o)break}else if(e.suffix){let a=Fe(e.suffix,n,i,t);if(a===O.NO_SUFFIX_MATCH)break;if(a===O.SUFFIX_MATCH){r.push(n.cloneRange()),Ie(i,i.startContainer,i.startOffset);continue}if(a===O.MISPLACED_SUFFIX)continue}else r.push(n.cloneRange())}return r},O={NO_SUFFIX_MATCH:0,SUFFIX_MATCH:1,MISPLACED_SUFFIX:2},Fe=(e,t,n,r)=>{let i=r.createRange();i.setStart(t.endContainer,t.endOffset),i.setEnd(n.endContainer,n.endOffset),Le(i);let a=Ke(e,i);return a==null?O.NO_SUFFIX_MATCH:a.compareBoundaryPoints(Range.START_TO_START,i)===0?O.SUFFIX_MATCH:O.MISPLACED_SUFFIX},Ie=(e,t,n)=>{try{e.setStart(t,n+1)}catch{e.setStartAfter(t)}},Le=e=>{let t=Re(e),n=t.nextNode();for(;!e.collapsed&&n!=null;){if(n!==e.startContainer&&e.setStart(n,0),n.textContent.length>e.startOffset&&!n.textContent[e.startOffset].match(/\s/))return;try{e.setStart(n,e.startOffset+1)}catch{n=t.nextNode(),n==null?e.collapse():e.setStart(n,0)}}},Re=e=>(e.commonAncestorContainer.ownerDocument??e.commonAncestorContainer).createTreeWalker(e.commonAncestorContainer,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,{acceptNode:t=>He(t,e)}),ze=e=>{if(e.hidden===`until-found`)return!0;let t=e.attributes;return!!(t&&t.hidden&&t.hidden.value===`until-found`)},Be=e=>{let t=e;for(;t!=null&&t.nodeType!==Node.ELEMENT_NODE;)t=t.parentNode;let n=t,r=n?.ownerDocument?.defaultView;if(n!=null&&r!=null){if(ze(n))return!0;let e=r.getComputedStyle(n);if(e.visibility===`hidden`||e.display===`none`||parseInt(e.height,10)===0&&e.overflowY!=`visible`||parseInt(e.width,10)===0&&e.overflowX!=`visible`||parseInt(e.opacity,10)===0)return!1}return!0},Ve=(e,t)=>t!=null&&!t.intersectsNode(e)?NodeFilter.FILTER_REJECT:Be(e)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT,He=(e,t)=>t!=null&&!t.intersectsNode(e)||!Be(e)?NodeFilter.FILTER_REJECT:e.nodeType===Node.TEXT_NODE?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP,Ue=(e,t)=>{let n=[],r=[],i=Array.from(Ge(e,e=>Ve(e,t)));for(let e of i)e.nodeType===Node.TEXT_NODE?r.push(e):e.nodeType===Node.ELEMENT_NODE&&Me.includes(e.tagName.toUpperCase())&&r.length>0&&(n.push(r),r=[]);return r.length>0&&n.push(r),n},We=(e,t,n)=>{let r=``;return r=e.length===1?e[0].textContent.substring(t,n):e[0].textContent.substring(t)+e.slice(1,-1).reduce((e,t)=>e+t.textContent,``)+e.slice(-1)[0].textContent.substring(0,n),r.replace(/[\t\n\r ]+/g,` `)};function*Ge(e,t){let n=(e.ownerDocument??e).createTreeWalker(e,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:t}),r=new Set;for(;Qe(n,r)!==null;)yield n.currentNode}var Ke=(e,t)=>{let n=Ue(t.commonAncestorContainer,t),r=Ze(t.commonAncestorContainer.ownerDocument??void 0);for(let i of n){let n=qe(e,t,i,r);if(n!==void 0)return n}},qe=(e,t,n,r)=>{if(!e||!t||!(n||[]).length)return;let i=n[0]===t.startContainer?t.startOffset:0,a=Xe(We(n,i,void 0)),o=Xe(e),s=0,c,l;for(;s<a.length;){let e=a.indexOf(o,s);if(e===-1)return;if(Ye(a,e,o.length,r)){let t=Xe(n[0].data.slice(0,i)).length;c=Je(t+e,n,!1),l=Je(t+e+o.length,n,!0)}if(c!=null&&l!=null){let e=new Range;if(e.setStart(c.node,c.offset),e.setEnd(l.node,l.offset),t.compareBoundaryPoints(Range.START_TO_START,e)<=0&&t.compareBoundaryPoints(Range.END_TO_END,e)>=0)return e}s=e+1}},Je=(e,t,n)=>{let r=0,i;for(let a=0;a<t.length;a++){let o=t[a];i||(i=Xe(o.data));let s=r+i.length;if(n&&(s+=1),s>e){let t=e-r,a=Math.min(e-r,o.data.length),s=n?i.substring(0,t):i.substring(t),c=Xe(n?o.data.substring(0,a):o.data.substring(a)),l=(n?-1:1)*(s.length>c.length?-1:1);for(;a>=0&&a<=o.data.length;){if(c.length===s.length)return{node:o,offset:a};a+=l,c=Xe(n?o.data.substring(0,a):o.data.substring(a))}}if(r+=i.length,a+1<t.length){let e=Xe(t[a+1].data);i.slice(-1)===` `&&e.slice(0,1)===` `&&--r,i=e}}},Ye=(e,t,n,r)=>{if(t<0||t>=e.length||n<=0||t+n>e.length)return!1;if(r){let i=r.segment(e),a=i.containing(t);if(!a||a.isWordLike&&a.index!=t)return!1;let o=t+n,s=i.containing(o);if(s&&s.isWordLike&&s.index!=o)return!1}else if(e[t].match(Ne)&&(++t,--n,!n)||e[t+n-1].match(Ne)&&(--n,!n)||t!==0&&!e[t-1].match(Ne)||t+n!==e.length&&!e[t+n].match(Ne))return!1;return!0},Xe=e=>(e||``).normalize(`NFKD`).replace(/\s+/g,` `).replace(/[\u0300-\u036f]/g,``).toLowerCase(),Ze=e=>{if(Intl.Segmenter){let t=e?.documentElement?.lang||e?.defaultView?.navigator?.language||void 0;return new Intl.Segmenter(t,{granularity:`word`})}},Qe=(e,t)=>{if(!t.has(e.currentNode)){let t=e.firstChild();if(t!==null)return t}let n=e.nextSibling();if(n!==null)return n;let r=e.parentNode();return r!==null&&t.add(r),r};function $e(e){return e.otherLocations?.get(`cssSelector`)}function et(e){return oe.deserialize(e.otherLocations?.get(`domRange`))}function tt(e){return e.fragments?.map(e=>je(e)).find(e=>e)}function nt(e){return new Map(e.fragments?.map(e=>e.startsWith(`#`)?e.slice(1):e).join(`&`).split(`&`).filter(e=>!e.startsWith(`#`)).map(e=>e.split(`=`)).filter(e=>e.length===2).map(e=>[e[0].trim().toLowerCase(),e[1].trim()]))}function rt(e){if(!e.fragments?.length)return;let t=e.fragments.find(e=>e.length&&!e.includes(`=`));if(!t){let n=nt(e);n.has(`id`)?t=n.get(`id`):n.has(`name`)&&(t=n.get(`name`))}let n=t?.startsWith(`#`)?t.slice(1):t;return n===void 0?void 0:Te(n)}function it(e){let t=nt(e).get(`t`);if(t)return se(t)}var k=class e{constructor(e){let t,n,r=e.mediaType.replace(/\s/g,``).split(`;`),i=r[0].split(`/`);if(i.length===2){if(t=i[0].toLowerCase().trim(),n=i[1].toLowerCase().trim(),t.length===0||n.length===0)throw Error(`Invalid media type`)}else throw Error(`Invalid media type`);let a={};for(let e=1;e<r.length;e++){let t=r[e].split(`=`);if(t.length===2){let e=t[0].toLocaleLowerCase();a[e]=e===`charset`?t[1].toUpperCase():t[1]}}let o={},s=Object.keys(a);s.sort((e,t)=>e.localeCompare(t)),s.forEach(e=>o[e]=a[e]);let c=``;for(let e in o){let t=o[e];c+=`;${e}=${t}`}let l=`${t}/${n}${c}`,u=o.encoding;this.string=l,this.type=t,this.subtype=n,this.parameters=o,this.encoding=u,this.name=e.name,this.fileExtension=e.fileExtension}static parse(t){return new e(t)}get structuredSyntaxSuffix(){let e=this.subtype.split(`+`);return e.length>1?`+${e[e.length-1]}`:void 0}get essence(){return`${this.type}/${this.subtype}`}get charset(){return this.parameters.charset}contains(t){let n=typeof t==`string`?e.parse({mediaType:t}):t;if(this.type!==`*`&&this.type!==n.type||this.subtype!==`*`&&this.subtype!==n.subtype)return!1;let r=new Set(Object.entries(this.parameters).map(([e,t])=>`${e}=${t}`)),i=new Set(Object.entries(n.parameters).map(([e,t])=>`${e}=${t}`));for(let e of Array.from(r.values()))if(!i.has(e))return!1;return!0}matches(t){let n=typeof t==`string`?e.parse({mediaType:t}):t;return this.contains(n)||n.contains(this)}matchesAny(...e){for(let t of e)if(this.matches(t))return!0;return!1}equals(e){return this.string===e.string}get isZIP(){return this.matchesAny(e.ZIP,e.LCP_PROTECTED_AUDIOBOOK,e.LCP_PROTECTED_PDF)||this.structuredSyntaxSuffix===`+zip`}get isJSON(){return this.matchesAny(e.JSON)||this.structuredSyntaxSuffix===`+json`}get isOPDS(){return this.matchesAny(e.OPDS1,e.OPDS1_ENTRY,e.OPDS2,e.OPDS2_PUBLICATION,e.OPDS_AUTHENTICATION)||this.structuredSyntaxSuffix===`+json`}get isHTML(){return this.matchesAny(e.HTML,e.XHTML)}get isBitmap(){return this.matchesAny(e.AVIF,e.BMP,e.GIF,e.JPEG,e.PNG,e.TIFF,e.WEBP)}get isAudio(){return this.type===`audio`}get isVideo(){return this.type===`video`}get isRWPM(){return this.matchesAny(e.READIUM_AUDIOBOOK_MANIFEST,e.DIVINA_MANIFEST,e.READIUM_WEBPUB_MANIFEST)}get isPublication(){return this.matchesAny(e.READIUM_AUDIOBOOK,e.READIUM_AUDIOBOOK_MANIFEST,e.CBZ,e.DIVINA,e.DIVINA_MANIFEST,e.EPUB,e.LCP_PROTECTED_AUDIOBOOK,e.LCP_PROTECTED_PDF,e.LPF,e.PDF,e.W3C_WPUB_MANIFEST,e.READIUM_WEBPUB,e.READIUM_WEBPUB_MANIFEST,e.ZAB)}static get AAC(){return e.parse({mediaType:`audio/aac`,fileExtension:`aac`})}static get ACSM(){return e.parse({mediaType:`application/vnd.adobe.adept+xml`,name:`Adobe Content Server Message`,fileExtension:`acsm`})}static get AIFF(){return e.parse({mediaType:`audio/aiff`,fileExtension:`aiff`})}static get AVI(){return e.parse({mediaType:`video/x-msvideo`,fileExtension:`avi`})}static get AVIF(){return e.parse({mediaType:`image/avif`,fileExtension:`avif`})}static get BINARY(){return e.parse({mediaType:`application/octet-stream`})}static get BMP(){return e.parse({mediaType:`image/bmp`,fileExtension:`bmp`})}static get CBZ(){return e.parse({mediaType:`application/vnd.comicbook+zip`,name:`Comic Book Archive`,fileExtension:`cbz`})}static get CSS(){return e.parse({mediaType:`text/css`,fileExtension:`css`})}static get DIVINA(){return e.parse({mediaType:`application/divina+zip`,name:`Digital Visual Narratives`,fileExtension:`divina`})}static get DIVINA_MANIFEST(){return e.parse({mediaType:`application/divina+json`,name:`Digital Visual Narratives`,fileExtension:`json`})}static get EPUB(){return e.parse({mediaType:`application/epub+zip`,name:`EPUB`,fileExtension:`epub`})}static get GIF(){return e.parse({mediaType:`image/gif`,fileExtension:`gif`})}static get GZ(){return e.parse({mediaType:`application/gzip`,fileExtension:`gz`})}static get HTML(){return e.parse({mediaType:`text/html`,fileExtension:`html`})}static get JAVASCRIPT(){return e.parse({mediaType:`text/javascript`,fileExtension:`js`})}static get JPEG(){return e.parse({mediaType:`image/jpeg`,fileExtension:`jpeg`})}static get JSON(){return e.parse({mediaType:`application/json`})}static get LCP_LICENSE_DOCUMENT(){return e.parse({mediaType:`application/vnd.readium.lcp.license.v1.0+json`,name:`LCP License`,fileExtension:`lcpl`})}static get LCP_PROTECTED_AUDIOBOOK(){return e.parse({mediaType:`application/audiobook+lcp`,name:`LCP Protected Audiobook`,fileExtension:`lcpa`})}static get LCP_PROTECTED_PDF(){return e.parse({mediaType:`application/pdf+lcp`,name:`LCP Protected PDF`,fileExtension:`lcpdf`})}static get LCP_STATUS_DOCUMENT(){return e.parse({mediaType:`application/vnd.readium.license.status.v1.0+json`})}static get LPF(){return e.parse({mediaType:`application/lpf+zip`,fileExtension:`lpf`})}static get MP3(){return e.parse({mediaType:`audio/mpeg`,fileExtension:`mp3`})}static get MPEG(){return e.parse({mediaType:`video/mpeg`,fileExtension:`mpeg`})}static get NCX(){return e.parse({mediaType:`application/x-dtbncx+xml`,fileExtension:`ncx`})}static get OGG(){return e.parse({mediaType:`audio/ogg`,fileExtension:`oga`})}static get OGV(){return e.parse({mediaType:`video/ogg`,fileExtension:`ogv`})}static get OPDS1(){return e.parse({mediaType:`application/atom+xml;profile=opds-catalog`})}static get OPDS1_ENTRY(){return e.parse({mediaType:`application/atom+xml;type=entry;profile=opds-catalog`})}static get OPDS2(){return e.parse({mediaType:`application/opds+json`})}static get OPDS2_PUBLICATION(){return e.parse({mediaType:`application/opds-publication+json`})}static get OPDS_AUTHENTICATION(){return e.parse({mediaType:`application/opds-authentication+json`})}static get OPUS(){return e.parse({mediaType:`audio/opus`,fileExtension:`opus`})}static get OTF(){return e.parse({mediaType:`font/otf`,fileExtension:`otf`})}static get PDF(){return e.parse({mediaType:`application/pdf`,name:`PDF`,fileExtension:`pdf`})}static get PNG(){return e.parse({mediaType:`image/png`,fileExtension:`png`})}static get READIUM_AUDIOBOOK(){return e.parse({mediaType:`application/audiobook+zip`,name:`Readium Audiobook`,fileExtension:`audiobook`})}static get READIUM_AUDIOBOOK_MANIFEST(){return e.parse({mediaType:`application/audiobook+json`,name:`Readium Audiobook`,fileExtension:`json`})}static get READIUM_CONTENT_DOCUMENT(){return e.parse({mediaType:`application/vnd.readium.content+json`,name:`Readium Content Document`,fileExtension:`json`})}static get READIUM_GUIDED_NAVIGATION_DOCUMENT(){return e.parse({mediaType:`application/guided-navigation+json`,name:`Readium Guided Navigation Document`,fileExtension:`json`})}static get READIUM_POSITION_LIST(){return e.parse({mediaType:`application/vnd.readium.position-list+json`,name:`Readium Position List`,fileExtension:`json`})}static get READIUM_WEBPUB(){return e.parse({mediaType:`application/webpub+zip`,name:`Readium Web Publication`,fileExtension:`webpub`})}static get READIUM_WEBPUB_MANIFEST(){return e.parse({mediaType:`application/webpub+json`,name:`Readium Web Publication`,fileExtension:`json`})}static get SMIL(){return e.parse({mediaType:`application/smil+xml`,fileExtension:`smil`})}static get SVG(){return e.parse({mediaType:`image/svg+xml`,fileExtension:`svg`})}static get TEXT(){return e.parse({mediaType:`text/plain`,fileExtension:`txt`})}static get TIFF(){return e.parse({mediaType:`image/tiff`,fileExtension:`tiff`})}static get TTF(){return e.parse({mediaType:`font/ttf`,fileExtension:`ttf`})}static get W3C_WPUB_MANIFEST(){return e.parse({mediaType:`application/x.readium.w3c.wpub+json`,name:`Web Publication`,fileExtension:`json`})}static get WAV(){return e.parse({mediaType:`audio/wav`,fileExtension:`wav`})}static get WEBM_AUDIO(){return e.parse({mediaType:`audio/webm`,fileExtension:`webm`})}static get WEBM_VIDEO(){return e.parse({mediaType:`video/webm`,fileExtension:`webm`})}static get WEBP(){return e.parse({mediaType:`image/webp`,fileExtension:`webp`})}static get WOFF(){return e.parse({mediaType:`font/woff`,fileExtension:`woff`})}static get WOFF2(){return e.parse({mediaType:`font/woff2`,fileExtension:`woff2`})}static get XHTML(){return e.parse({mediaType:`application/xhtml+xml`,fileExtension:`xhtml`})}static get XML(){return e.parse({mediaType:`application/xml`,fileExtension:`xml`})}static get ZAB(){return e.parse({mediaType:`application/x.readium.zab+zip`,name:`Zipped Audio Book`,fileExtension:`zab`})}static get ZIP(){return e.parse({mediaType:`application/zip`,fileExtension:`zip`})}},A=(e=>(e.left=`left`,e.right=`right`,e.center=`center`,e))(A||{}),at=class e{constructor(e){this.otherProperties=e}get page(){return this.otherProperties.page}static deserialize(t){if(t)return new e(t)}serialize(){return this.otherProperties}add(t){let n=Object.assign({},this.otherProperties);for(let e in t)n[e]=t[e];return new e(n)}},ot=class{constructor(e){this.uri=e,this.parameters=this.getParameters(e)}getParameters(e){let t=/\{\??([^}]+)\}/g,n=e.match(t);return n?new Set(n.join(`,`).replace(t,`$1`).split(`,`).map(e=>e.trim())):new Set}expand(e){let t=t=>t.split(`,`).map(t=>{let n=e[t];return n?encodeURIComponent(n):``}).join(`,`),n=t=>`?`+t.split(`,`).map(t=>{let n=t.split(`=`)[0],r=e[n];return r?`${n}=${encodeURIComponent(r)}`:``}).join(`&`);return this.uri.replace(/\{(\??)([^}]+)\}/g,(...e)=>e[1]?n(e[2]):t(e[2]))}},j=class e{constructor(e){this.fragments=e.fragments?e.fragments:[],this.progression=e.progression,this.totalProgression=e.totalProgression,this.position=e.position,this.otherLocations=e.otherLocations}static deserialize(t){if(!t)return;let n=u(t.progression),r=u(t.totalProgression),i=u(t.position),a=new Map,o=new Set([`fragment`,`fragments`,`progression`,`totalProgression`,`position`,`otherLocations`]);return Object.entries(t).forEach(([e,t])=>{o.has(e)||a.set(e,t)}),t.otherLocations?.forEach?.((e,t)=>a.set(t,e)),new e({fragments:c(t.fragments||t.fragment),progression:n!==void 0&&n>=0&&n<=1?n:void 0,totalProgression:r!==void 0&&r>=0&&r<=1?r:void 0,position:i!==void 0&&i>0?i:void 0,otherLocations:a.size===0?void 0:a})}serialize(){let e={};return this.fragments&&(e.fragments=this.fragments),this.progression!==void 0&&(e.progression=this.progression),this.totalProgression!==void 0&&(e.totalProgression=this.totalProgression),this.position!==void 0&&(e.position=this.position),this.otherLocations&&this.otherLocations.forEach((t,n)=>e[n]=t),e}},st=class e{constructor(e){this.after=e.after,this.before=e.before,this.highlight=e.highlight}static deserialize(t){if(t)return new e({after:t.after,before:t.before,highlight:t.highlight})}serialize(){let e={};return this.after!==void 0&&(e.after=this.after),this.before!==void 0&&(e.before=this.before),this.highlight!==void 0&&(e.highlight=this.highlight),e}},M=class e{constructor(e){let t=e.href.indexOf(`#`),n=t>=0?e.href.slice(t+1):void 0;this.href=t>=0?e.href.slice(0,t):e.href,this.type=e.type,this.title=e.title;let r=e.locations?.fragments,i=n&&(!r||r.length===0);this.locations=e.locations?i?new j({...e.locations,fragments:[n]}):e.locations:n?new j({fragments:[n]}):new j({}),this.text=e.text}static deserialize(t){if(t&&t.href&&t.type)return new e({href:t.href,type:t.type,title:t.title,locations:j.deserialize(t.locations),text:st.deserialize(t.text)})}serialize(){let e={href:this.href,type:this.type};return this.title!==void 0&&(e.title=this.title),this.locations&&(e.locations=this.locations.serialize()),this.text&&(e.text=this.text.serialize()),e}copyWithLocations(t){return new e({href:this.href,type:this.type,title:this.title,text:this.text,locations:new j({...this.locations,...t})})}},N=class e{constructor(e){this.href=e.href,this.templated=e.templated,this.type=e.type,this.title=e.title,this.rels=e.rels,this.properties=e.properties,this.height=e.height,this.width=e.width,this.size=e.size,this.duration=e.duration,this.bitrate=e.bitrate,this.languages=e.languages,this.alternates=e.alternates,this.children=e.children}static deserialize(t){if(t&&typeof t.href==`string`)return new e({href:t.href,templated:t.templated,type:t.type,title:t.title,rels:t.rel?Array.isArray(t.rel)?new Set(t.rel):new Set([t.rel]):void 0,properties:at.deserialize(t.properties),height:d(t.height),width:d(t.width),size:d(t.size),duration:d(t.duration),bitrate:d(t.bitrate),languages:c(t.language),alternates:P.deserialize(t.alternate),children:P.deserialize(t.children)})}serialize(){let e={href:this.href};return this.templated!==void 0&&(e.templated=this.templated),this.type!==void 0&&(e.type=this.type),this.title!==void 0&&(e.title=this.title),this.rels&&(e.rel=f(this.rels)),this.properties&&(e.properties=this.properties.serialize()),this.height!==void 0&&(e.height=this.height),this.width!==void 0&&(e.width=this.width),this.size!==void 0&&(e.size=this.size),this.duration!==void 0&&(e.duration=this.duration),this.bitrate!==void 0&&(e.bitrate=this.bitrate),this.languages&&(e.language=this.languages),this.alternates&&(e.alternate=this.alternates.serialize()),this.children&&(e.children=this.children.serialize()),e}get mediaType(){return this.type===void 0?k.BINARY:k.parse({mediaType:this.type})}toURL(e){let t=this.href.replace(/^(\/)/,``);if(t.length===0)return;let n=e||`/`;return n.startsWith(`/`)&&(n=`file://`+n),new URL(t,n).href.replace(/^(file:\/\/)/,``)}get templateParameters(){return this.templated?new ot(this.href).parameters:new Set}expandTemplate(t){return new e({href:new ot(this.href).expand(t),templated:!1})}addProperties(t){let n=e.deserialize(this.serialize());return n.properties=n.properties?n.properties?.add(t):new at(t),n}get locator(){return new M({href:this.href,type:this.type??``,title:this.title})}},P=class e{constructor(e){this.items=e}static deserialize(t){if(t&&Array.isArray(t))return new e(t.map(e=>N.deserialize(e)).filter(e=>e!==void 0))}serialize(){return this.items.map(e=>e.serialize())}findWithRel(e){return this.items.find(t=>t.rels&&t.rels.has(e))}filterByRel(e){return this.items.filter(t=>t.rels&&t.rels.has(e))}findWithHref(e){return this.items.find(t=>t.href===e)}findIndexWithHref(e){return this.items.findIndex(t=>t.href===e)}findWithMediaType(e){return this.items.find(t=>t.mediaType.matches(e))}filterByMediaType(e){return this.items.filter(t=>t.mediaType.matches(e))}filterByMediaTypes(e){return this.items.filter(t=>{for(let n of e)if(t.mediaType.matches(n))return!0;return!1})}everyIsAudio(){return this.items.length>0&&this.items.every(e=>e.mediaType.isAudio)}everyIsBitmap(){return this.items.length>0&&this.items.every(e=>e.mediaType.isBitmap)}everyIsHTML(){return this.items.length>0&&this.items.every(e=>e.mediaType.isHTML)}everyIsVideo(){return this.items.length>0&&this.items.every(e=>e.mediaType.isVideo)}everyMatchesMediaType(e){return Array.isArray(e)?this.items.length>0&&this.items.every(t=>{for(let n of e)return t.mediaType.matches(n);return!1}):this.items.length>0&&this.items.every(t=>t.mediaType.matches(e))}filterLinksHasType(){return this.items.filter(e=>e.type)}},F=(e=>(e.EPUB=`https://readium.org/webpub-manifest/profiles/epub`,e.AUDIOBOOK=`https://readium.org/webpub-manifest/profiles/audiobook`,e.DIVINA=`https://readium.org/webpub-manifest/profiles/divina`,e.PDF=`https://readium.org/webpub-manifest/profiles/pdf`,e))(F||{}),ct=class e{constructor(e,t,n=[],r=[],i=void 0){this._trimmedLinkMap=new Map,this._allItems=e,this.linkMap=t,this._conformsTo=n,this.tocLinks=r,this._tocDepth=i}static build(t,n={}){let r=t.toc?.items??[],i=t.readingOrder.items,{depth:a}=n,o=t.metadata?.conformsTo??[],s=new Map,c=[];for(let t=0;t<i.length;t++){let n=i[t],o=e.bareHref(n.href),l=n.title??e.findTitleInToc(r,o,a),u=e.collectChildrenFromToc(r,o,a,1,s),d={title:l,references:[n.href],children:u.length>0?u:void 0};s.set(d,n),c.push(d)}return new e(c,s,o,r,a)}augment(e){for(let t of this.flatAll){let n=this.linkFor(t);if(!n)continue;let r=e(t,n);r.position!==void 0&&(t.position=r.position),r.scroll!==void 0&&(t.scroll=r.scroll),r.role!==void 0&&(t.role=r.role)}}get depth(){return this._depth}set depth(e){this._depth!==e&&(this._depth=e,this._tocDepth=e,this._items=void 0,this._flat=void 0,this._toc=void 0)}get items(){return this._items||(this._depth===void 0?this._items=this._allItems:(this._trimmedLinkMap=new Map,this._items=e.trimToDepth(this._allItems,this._depth,this.linkMap,this._trimmedLinkMap))),this._items}locate(e){let t=e.href.split(`#`)[0],n=it(e.locations),r=rt(e.locations),i=e.locations.progression;if(n!==void 0){let e=-1/0,r;for(let i of this.flat){if(!this.itemMatchesHref(i,t))continue;let a=this.itemStartTime(i,t);a!==void 0&&a<=n&&a>e&&(e=a,r=i)}if(r)return r}if(r){let e=this.flat.find(e=>this.itemMatchesHref(e,t)?e.references.some(e=>{let t=e.split(`#`)[1];return t!==void 0&&Te(t)===r}):!1);if(e)return e}if(i!==void 0){let e=-1/0,n;for(let r of this.flat){if(!this.itemMatchesHref(r,t))continue;let a=this.itemScrollPosition(r);a!==void 0&&a<=i&&a>e&&(e=a,n=r)}if(n)return n;let r=this.items.find(e=>this.itemMatchesHref(e,t));if(r?.children?.length&&!r.children.some(e=>e.scroll!==void 0)){let e=Math.min(Math.floor(i*r.children.length),r.children.length-1);return r.children[e]}}return this.flat.find(e=>this.itemMatchesHref(e,t))}navigableFrom(e){let t=this.flat.indexOf(e);return{previous:t>0?this.flat[t-1]:void 0,next:t>=0&&t<this.flat.length-1?this.flat[t+1]:void 0}}segmentsForHref(e){let t=e.split(`#`)[0],n=this.items.find(e=>this.itemMatchesHref(e,t));return n?n.children?.length?n.children:[n]:[]}ancestors(e){return this.ancestorPath(this.items,e)??[]}linkFor(e){return this.linkMap.get(e)??this._trimmedLinkMap.get(e)}get contextualizedToc(){return this._toc||(this._toc=this.tocLinks.length>0?this.buildTocEntries(this.tocLinks,this._tocDepth,1):this._allItems.map(e=>this.entryFor(this.linkFor(e),e))),this._toc}tocEntryFor(e){let t=this.linkFor(e);return t?this.findTocEntryByLink(this.contextualizedToc,t)||this.nearestTocEntryForResource(t.href,e)||this.previousResolvedTocEntry(t):void 0}get flat(){return this._flat||(this._flat=this.flattenItems(this.items)),this._flat}get flatAll(){return this.flattenItems(this._allItems)}static findTitleInToc(t,n,r){let{atStart:i,fragments:a}=e.collectTocCandidates(t,n,r,1);if(i.length>0)return i[0].title;if(a.length===1)return a[0].title}static collectChildrenFromToc(t,n,r,i,a){if(r!==void 0&&i>r)return[];let o=[];for(let s of t){let t=e.bareHref(s.href),c=s.href.startsWith(`#`);if((t===n||c&&t===``)&&s.title&&!e.isStartOfResource(s.href)){let e=t===``?n+s.href:s.href,r={title:s.title,references:[e]};a.set(r,s),o.push(r)}s.children?.items?.length&&o.push(...e.collectChildrenFromToc(s.children.items,n,r,i+1,a))}return o}static collectTocCandidates(t,n,r,i){if(r!==void 0&&i>r)return{atStart:[],fragments:[]};let a=[],o=[];for(let s of t){let t=e.bareHref(s.href),c=s.href.startsWith(`#`);if((t===n||c&&t===``)&&s.title&&(e.isStartOfResource(s.href)?a.push(s):o.push(s)),s.children?.items?.length){let t=e.collectTocCandidates(s.children.items,n,r,i+1);a.push(...t.atStart),o.push(...t.fragments)}}return{atStart:a,fragments:o}}static isStartOfResource(e){let t=e.split(`#`)[1];if(!t)return!0;let n=t.match(/(?:^|&)t=([^&]+)/);return n!==null&&ce(n[1])}get linkToItem(){if(!this._linkToItem){this._linkToItem=new Map;for(let[e,t]of this.linkMap)this._linkToItem.set(t,e)}return this._linkToItem}buildTocEntries(e,t,n){return t!==void 0&&n>t?[]:e.map(e=>{let r=this.linkToItem.get(e)??this.resourceStartItem(e.href),i=e.children?.items?.length?this.buildTocEntries(e.children.items,t,n+1):[];return{...this.entryFor(e,r),children:i.length>0?i:void 0}})}tocLinksFlat(e,t,n){if(t!==void 0&&n>t)return[];let r=[];for(let i of e)r.push(i),i.children?.items?.length&&r.push(...this.tocLinksFlat(i.children.items,t,n+1));return r}entryFor(e,t){let n=this._conformsTo.includes(F.AUDIOBOOK);return{link:e,position:!n&&t?.position!==void 0?String(t.position):void 0,timestamp:n&&t?.position!==void 0?le(t.position):void 0}}resourceStartItem(t){let n=e.bareHref(t);return this._allItems.find(e=>this.itemMatchesHref(e,n))}findTocEntryByLink(e,t){for(let n of e){if(n.link===t)return n;if(n.children){let e=this.findTocEntryByLink(n.children,t);if(e)return e}}}nearestTocEntryForResource(t,n){let r=e.bareHref(t),i=this.tocLinksFlat(this.tocLinks,this._tocDepth,1).filter(t=>e.bareHref(t.href)===r).map(e=>({link:e,item:this.linkToItem.get(e)??this.resourceStartItem(e.href)}));if(i.length===0)return;let a=this._conformsTo.includes(F.AUDIOBOOK),o=a?n.position??0:n.scroll??0,s,c=-1/0;for(let e of i){let t=a?e.item?.position??0:e.item?.scroll??0;t<=o&&t>c&&(c=t,s=e)}let l=s??i[0];return this.findTocEntryByLink(this.contextualizedToc,l.link)}previousResolvedTocEntry(t){let n=this._allItems.findIndex(e=>this.linkFor(e)===t);if(n!==-1)for(let t=n-1;t>=0;t--){let n=this.linkFor(this._allItems[t]);if(!n)continue;let r=e.bareHref(n.href),{atStart:i,fragments:a}=e.collectTocCandidates(this.tocLinks,r,this._tocDepth,1),o=i.filter(t=>e.bareHref(t.href)===r),s=a.filter(t=>e.bareHref(t.href)===r),c=o[0]??(s.length>0?s[s.length-1]:void 0);if(!c)continue;let l=this.findTocEntryByLink(this.contextualizedToc,c);if(l)return l}}static trimToDepth(t,n,r,i){return t.map(t=>{let a={...t,children:n>1&&t.children?.length?e.trimToDepth(t.children,n-1,r,i):void 0},o=r.get(t);return o&&i.set(a,o),a})}flattenItems(e){let t=[];for(let n of e)t.push(n),n.children&&t.push(...this.flattenItems(n.children));return t}itemStartTime(e,t){for(let n of e.references){let e=n.indexOf(`#`),r=e>=0?n.slice(0,e):n,i=e>=0?n.slice(e+1):void 0;if((r||t)!==t)continue;if(!i)return 0;let a=i.match(/(?:^|&)t=([^&]+)/);return a?se(a[1]):void 0}}itemMatchesHref(e,t){return e.references.some(e=>{let n=e.split(`#`)[0];return n===t||n===``})}ancestorPath(e,t){for(let n of e){if(n===t)return[];if(n.children){let e=this.ancestorPath(n.children,t);if(e!==null)return[n,...e]}}return null}itemScrollPosition(e){return e.scroll}static bareHref(e){return e.split(`#`)[0]}};function lt(e,t){return ct.build(e,t)}function ut(e,t){let n=ct.build(e,t),r=e.readingOrder.items;if(!(r.length<=1||r.every(e=>e.duration!==void 0)))return n;let i=0,a=new Map(r.map(e=>{let t=i;return i+=e.duration??0,[e.href,t]}));return n.augment((e,t)=>{let n=t.href,r=n.indexOf(`#`),i=r>=0?n.slice(0,r):n,o=r>=0?n.slice(r+1):void 0,s=a.get(i)??0,c=o?.match(/(?:^|&)t=([^&]+)/);return{position:s+((c?se(c[1]):void 0)??0)}}),n}function dt(e,t){return e.metadata?.conformsTo?.includes(F.AUDIOBOOK)??!1?ut(e,t):lt(e,t)}var ft=class e{constructor(e){this.value=e.value,this.scheme=e.scheme}static deserialize(t){if(t){if(typeof t==`string`)return new e({value:t});if(typeof t==`object`&&t.value)return new e({value:t.value,scheme:t.scheme})}}serialize(){return this.scheme?{value:this.value,scheme:this.scheme}:this.value}},pt=class e{constructor(t){this.translations=typeof t==`string`?{[e.UNDEFINED_LANGUAGE]:t}:t}static deserialize(t){if(t&&(typeof t==`string`||t.constructor===Object))return new e(t)}serialize(){return this.translations}getTranslation(t){return this.translations[t||e.UNDEFINED_LANGUAGE]||this.translations[e.UNDEFINED_LANGUAGE]||this.translations[e.LANGUAGE_EN]||(Object.values(this.translations).length===0?``:Object.values(this.translations)[0])}};pt.UNDEFINED_LANGUAGE=`und`,pt.LANGUAGE_EN=`en`;var I=pt,mt=class e{constructor(e){this.name=e.name,this.sortAs=e.sortAs,this.identifier=e.identifier,this.altIdentifiers=e.altIdentifiers,this.roles=e.roles,this.links=e.links,this.position=e.position}static deserialize(t){if(t)return typeof t==`string`?new e({name:I.deserialize(t)}):t.name?new e({name:I.deserialize(t.name),sortAs:I.deserialize(t.sortAs),identifier:t.identifier,altIdentifiers:t.altIdentifier?Array.isArray(t.altIdentifier)?new Set(t.altIdentifier.map(e=>ft.deserialize(e)).filter(e=>e!==void 0)):new Set([ft.deserialize(t.altIdentifier)].filter(e=>e!==void 0)):void 0,roles:t.role?new Set(c(t.role)):void 0,links:P.deserialize(t.links),position:u(t.position)}):void 0}serialize(){let e={name:this.name.serialize()};return this.sortAs!==void 0&&(e.sortAs=this.sortAs.serialize()),this.identifier!==void 0&&(e.identifier=this.identifier),this.altIdentifiers&&(e.altIdentifier=f(this.altIdentifiers).map(e=>e.serialize())),this.roles&&(e.role=f(this.roles)),this.links&&(e.links=this.links.serialize()),this.position!==void 0&&(e.position=this.position),e}},L=class e{constructor(e){this.items=e}static deserialize(t){if(t)return new e((Array.isArray(t)?t:[t]).map(e=>mt.deserialize(e)).filter(e=>e!==void 0))}serialize(){return this.items.map(e=>e.serialize())}},ht=class e{constructor(e){this.items=e&&e.items?e.items:new Map}static deserialize(t){if(!(t&&typeof t==`object`))return;let n=new Map;return Object.entries(t).forEach(([e,t])=>{let r=L.deserialize(t);r&&r.items.length>0&&n.set(e,r)}),new e({items:n})}serialize(){let e={};return this.items.forEach((t,n)=>e[n]=t.serialize()),e}},R=(e=>(e.ltr=`ltr`,e.rtl=`rtl`,e))(R||{}),gt=class e{constructor(e){this.name=e.name,this.sortAs=e.sortAs,this.code=e.code,this.scheme=e.scheme,this.links=e.links}static deserialize(t){if(t)return typeof t==`string`?new e({name:I.deserialize(t)}):t.name?new e({name:I.deserialize(t.name),sortAs:t.sortAs?I.deserialize(t.sortAs):void 0,code:t.code,scheme:t.scheme,links:P.deserialize(t.links)}):void 0}serialize(){let e={name:this.name.serialize()};return this.sortAs!==void 0&&(e.sortAs=this.sortAs.serialize()),this.code!==void 0&&(e.code=this.code),this.scheme!==void 0&&(e.scheme=this.scheme),this.links&&(e.links=this.links.serialize()),e}},_t=class e{constructor(e){this.items=e}static deserialize(t){if(t)return new e((Array.isArray(t)?t:[t]).map(e=>gt.deserialize(e)).filter(e=>e!==void 0))}serialize(){return this.items.map(e=>e.serialize())}},vt=(e=>(e.all=`all`,e.none=`none`,e))(vt||{}),yt=class e{constructor(e){this.reservation=e.reservation,this.policy=e.policy}static deserialize(t){if(t)return new e({reservation:t.reservation,policy:t.policy})}serialize(){let e={};return this.reservation!==void 0&&(e.reservation=this.reservation),this.policy!==void 0&&(e.policy=this.policy),e}},bt=class e{constructor(e){this.title=e.title,this.typeUri=e.typeUri,this.conformsTo=e.conformsTo,this.identifier=e.identifier,this.altIdentifier=e.altIdentifier,this.subtitle=e.subtitle,this.sortAs=e.sortAs,this.artists=e.artists,this.authors=e.authors,this.colorists=e.colorists,this.contributors=e.contributors,this.editors=e.editors,this.illustrators=e.illustrators,this.inkers=e.inkers,this.letterers=e.letterers,this.narrators=e.narrators,this.pencilers=e.pencilers,this.translators=e.translators,this.languages=e.languages,this.description=e.description,this.publishers=e.publishers,this.imprints=e.imprints,this.published=e.published,this.modified=e.modified,this.subjects=e.subjects,this.belongsTo=e.belongsTo,this.belongsToCollections=e.belongsToCollections,this.belongsToSeries=e.belongsToSeries,this.belongsToCollections&&this.belongsToCollections.items.length>0&&(this.belongsTo||(this.belongsTo=new ht),this.belongsTo.items.set(`collection`,this.belongsToCollections)),this.belongsToSeries&&this.belongsToSeries.items.length>0&&(this.belongsTo||(this.belongsTo=new ht),this.belongsTo.items.set(`series`,this.belongsToSeries)),this.layout=e.layout,this.readingProgression=e.readingProgression,this.duration=e.duration,this.numberOfPages=e.numberOfPages,this.accessibility=e.accessibility,this.tdm=e.tdm,this.otherMetadata=e.otherMetadata}static deserialize(t){if(!(t&&t.title))return;let n=I.deserialize(t.title),r=t[`@type`],i=c(t.conformsTo),a=t.identifier,o=ft.deserialize(t.altIdentifier),s=I.deserialize(t.subtitle),u=I.deserialize(t.sortAs),f=L.deserialize(t.artist),m=L.deserialize(t.author),h=L.deserialize(t.colorist),g=L.deserialize(t.contributor),_=L.deserialize(t.editor),ee=L.deserialize(t.illustrator),v=L.deserialize(t.inker),te=L.deserialize(t.letterer),y=L.deserialize(t.narrator),ne=L.deserialize(t.penciler),b=L.deserialize(t.translator),re=c(t.language),x=t.description,ie=L.deserialize(t.publisher),S=L.deserialize(t.imprint),ae=l(t.published),oe=l(t.modified),se=_t.deserialize(t.subject),ce=ht.deserialize(t.belongsTo),le=p.deserialize(t.accessibility),ue=t.layout,de=t.readingProgression,fe=d(t.duration),C=d(t.numberOfPages),w=yt.deserialize(t.tdm),pe=Object.assign({},t);return e.mappedProperties.forEach(e=>delete pe[e]),Object.keys(pe).length===0&&(pe=void 0),new e({title:n,typeUri:r,conformsTo:i,identifier:a,altIdentifier:o,subtitle:s,sortAs:u,artists:f,authors:m,colorists:h,contributors:g,editors:_,illustrators:ee,inkers:v,letterers:te,narrators:y,pencilers:ne,translators:b,languages:re,description:x,publishers:ie,imprints:S,published:ae,modified:oe,subjects:se,belongsTo:ce,layout:ue,readingProgression:de,duration:fe,numberOfPages:C,accessibility:le,tdm:w,otherMetadata:pe})}serialize(){let e={title:this.title.serialize()};if(this.typeUri!==void 0&&(e[`@type`]=this.typeUri),this.conformsTo&&(e.conformsTo=this.conformsTo),this.identifier!==void 0&&(e.identifier=this.identifier),this.altIdentifier&&(e.altIdentifier=this.altIdentifier.serialize()),this.subtitle&&(e.subtitle=this.subtitle.serialize()),this.sortAs&&(e.sortAs=this.sortAs.serialize()),this.editors&&(e.editor=this.editors.serialize()),this.artists&&(e.artist=this.artists.serialize()),this.authors&&(e.author=this.authors.serialize()),this.colorists&&(e.colorist=this.colorists.serialize()),this.contributors&&(e.contributor=this.contributors.serialize()),this.illustrators&&(e.illustrator=this.illustrators.serialize()),this.letterers&&(e.letterer=this.letterers.serialize()),this.narrators&&(e.narrator=this.narrators.serialize()),this.pencilers&&(e.penciler=this.pencilers.serialize()),this.translators&&(e.translator=this.translators.serialize()),this.inkers&&(e.inker=this.inkers.serialize()),this.languages&&(e.language=this.languages),this.description!==void 0&&(e.description=this.description),this.publishers&&(e.publisher=this.publishers.serialize()),this.imprints&&(e.imprint=this.imprints.serialize()),this.published!==void 0&&(e.published=this.published.toISOString()),this.modified!==void 0&&(e.modified=this.modified.toISOString()),this.subjects&&(e.subject=this.subjects.serialize()),this.belongsTo&&(e.belongsTo=this.belongsTo.serialize()),this.layout&&(e.layout=this.layout),this.readingProgression&&(e.readingProgression=this.readingProgression),this.duration!==void 0&&(e.duration=this.duration),this.numberOfPages!==void 0&&(e.numberOfPages=this.numberOfPages),this.accessibility&&(e.accessibility=this.accessibility.serialize()),this.tdm&&(e.tdm=this.tdm.serialize()),this.otherMetadata){let t=this.otherMetadata;Object.keys(t).forEach(n=>e[n]=t[n])}return e}get effectiveLayout(){if(!this.conformsTo)return null;for(let e of this.conformsTo)switch(e){case F.EPUB:return this.layout||S.reflowable;case F.DIVINA:return this.layout===S.reflowable?S.fixed:this.layout||S.fixed;case F.AUDIOBOOK:case F.PDF:return null}return null}get effectiveReadingProgression(){if(this.readingProgression)return this.readingProgression;if(this.languages?.length!==1)return R.ltr;let e=this.languages[0].toLowerCase();if(e===`zh-hant`||e===`zh-tw`)return R.rtl;switch(e.split(`-`)[0]){case`ar`:return R.rtl;case`fa`:return R.rtl;case`he`:return R.rtl;default:return R.ltr}}};bt.mappedProperties=`title.@type.conformsTo.identifier.altIdentifier.subtitle.sortAs.artist.author.colorist.contributor.editor.illustrator.inker.letterer.narrator.penciler.translator.language.description.publisher.imprint.published.modified.subject.belongsTo.layout.readingProgression.duration.numberOfPages.accessibility.tdm`.split(`.`);var xt=bt,St=class e{constructor(e){this.metadata=e.metadata,this.links=e.links,this.subcollections=e.subcollections}static deserialize(t){if(!t)return;let n,r,i;if(Array.isArray(t))n=P.deserialize(t);else if(typeof t==`object`)n=P.deserialize(t.links),r=new Map,t.metadata&&Object.entries(t.metadata).forEach(([e,t])=>{r?.set(e,t)}),i=e.deserializeCollections(t);else return;if(n&&n.items.length!==0)return new e({metadata:r?.size?r:void 0,links:n,subcollections:i?.size?i:void 0})}static deserializeCollections(t){if(!t)return;let n=new Map;return Object.entries(t).forEach(([t,r])=>{if(t!==`links`&&t!==`metadata`){let i=e.deserialize(r);if(i){let e=[];e.push(i),n.set(t,e)}else if(Array.isArray(r)){let i=r.map(t=>e.deserialize(t)).filter(e=>e!==void 0);n.set(t,i)}}}),n.size?n:void 0}serialize(){let t={};return this.metadata&&(t.metadata={},this.metadata.forEach((e,n)=>t.metadata[n]=e)),this.links.items.length&&(t.links=this.links.serialize()),e.serializeCollection(t,this.subcollections),t}static serializeCollection(e,t){t&&t.size>0&&t.forEach((t,n)=>{e[n]=t.length===1?t[0].serialize():t.map(e=>e.serialize())})}},Ct=class e{constructor(e){this.context=e.context,this.metadata=e.metadata,this.links=e.links||new P([]),this.readingOrder=e.readingOrder,this.resources=e.resources,this.toc=e.toc,this.subcollections=e.subcollections}static deserialize(t){if(!t)return;let n=xt.deserialize(t.metadata);if(!n)return;let r=P.deserialize(t.readingOrder?t.readingOrder:t.spine);if(!r)return;let i=new Set([`@context`,`metadata`,`links`,`readingOrder`,`spine`,`resources`,`toc`]),a={};return Object.keys(t).forEach(e=>{i.has(e)||(a[e]=t[e])}),new e({context:c(t[`@context`]),metadata:n,links:P.deserialize(t.links),readingOrder:r,resources:P.deserialize(t.resources),toc:P.deserialize(t.toc),subcollections:St.deserializeCollections(a)})}serialize(){let e={};return this.context!==void 0&&(e[`@context`]=this.context),e.metadata=this.metadata.serialize(),this.links&&this.links.items.length>0&&(e.links=this.links.serialize()),e.readingOrder=this.readingOrder.serialize(),this.resources&&(e.resources=this.resources.serialize()),this.toc&&(e.toc=this.toc.serialize()),St.serializeCollection(e,this.subcollections),e}linkWithRel(e){let t=[];t.push(this.readingOrder),this.resources&&t.push(this.resources),this.links&&t.push(this.links);let n;for(let r of t)if(n=r.findWithRel(e),n!==void 0)return n;return n}linksWithRel(e){let t=[];return t.push(this.readingOrder.filterByRel(e)),this.resources&&t.push(this.resources.filterByRel(e)),this.links&&t.push(this.links.filterByRel(e)),t.reduce((e,t)=>e.concat(t),[])}locatorFromLink(e){let t=e.href.split(`#`)[0],n=this.linkWithHref(t);if(!n)return;let r=n.type;if(!r)return;let i=e.href.includes(`#`);return new M({href:e.href,type:r,title:n.title??e.title,locations:new j({progression:i?void 0:0})})}linkWithHref(e){let t=n=>{let r;for(let t of n)if(r=t.findWithHref(e),r!==void 0)return r;let i=[];return n.forEach(e=>{let t=[];for(let n of e.items)n.alternates&&t.push(n.alternates),n.children&&t.push(n.children);i.push(...t)}),i.length>0&&(r=t(i)),r},n=[];n.push(this.readingOrder),this.resources&&n.push(this.resources),this.links&&n.push(this.links);let r=t(n);if(r!==void 0)return r;let i=e.split(/[#]/);if(i.length<2)return;let a=i[0];return this.linkWithHref(a)}get baseURL(){let e=this.links?.items.find(e=>e.rels&&e.rels.has(`self`));if(!e)return;let t=e.href;if(t)try{let e=new URL(t);return e.search=``,e.hash=``,e.pathname=e.pathname.substring(0,e.pathname.lastIndexOf(`/`)+1),e.href}catch{return t.split(/[?#]/)[0].replace(/[^/]*$/,``)}}setSelfLink(e){this.links||(this.links=new P([])),this.links.items=this.links.items.filter(e=>e.rels===void 0||!e.rels?.has(`self`)),this.links.items.push(new N({href:e,type:k.READIUM_WEBPUB_MANIFEST.string,rels:new Set([`self`])}))}},wt=class e{constructor(e){this.guided=e.guided}static deserialize(t){if(!t)return;let n=Dt.deserializeArray(t.guided);if(n&&n.length!==0)return new e({guided:n})}serialize(){return{guided:this.guided.map(e=>e.serialize())}}},Tt=class e{constructor(e){this.plain=e.plain,this.ssml=e.ssml,this.language=e.language}static deserialize(t){if(t!=null){if(typeof t==`string`)return t.length>0?new e({plain:t}):void 0;if(t.plain||t.ssml)return new e({plain:t.plain,ssml:t.ssml,language:t.language})}}serialize(){let e={};return this.plain!==void 0&&(e.plain=this.plain),this.ssml!==void 0&&(e.ssml=this.ssml),this.language!==void 0&&(e.language=this.language),Object.keys(e).length>0?e:void 0}},Et=class e{constructor(e){this.audioref=e.audioref,this.imgref=e.imgref,this.textref=e.textref,this.videoref=e.videoref,this.text=e.text}static deserialize(t){if(!t)return;if(typeof t==`string`){let n=Tt.deserialize(t);return n?new e({text:n}):void 0}let n=new e({audioref:t.audioref,imgref:t.imgref,textref:t.textref,videoref:t.videoref,text:Tt.deserialize(t.text)});if(n.audioref!==void 0||n.imgref!==void 0||n.textref!==void 0||n.videoref!==void 0||n.text!==void 0)return n}serialize(){let e={};this.audioref!==void 0&&(e.audioref=this.audioref),this.imgref!==void 0&&(e.imgref=this.imgref),this.textref!==void 0&&(e.textref=this.textref),this.videoref!==void 0&&(e.videoref=this.videoref);let t=this.text?.serialize();return t!==void 0&&(e.text=t),e}},Dt=class e{constructor(e){this.id=e.id,this.audioref=e.audioref,this.children=e.children,this.imgref=e.imgref,this.role=e.role,this.text=e.text,this.textref=e.textref,this.videoref=e.videoref,this.description=e.description}get plainText(){return this.text?.plain}get ssmlText(){return this.text?.ssml}get textLanguage(){return this.text?.language}static deserialize(t){if(!t)return;let n=e.deserializeArray(t.children),r=new e({id:typeof t.id==`string`?t.id:void 0,audioref:t.audioref,children:n&&n.length>0?n:void 0,imgref:t.imgref,role:t.role?new Set(c(t.role)):void 0,text:Tt.deserialize(t.text),textref:t.textref,videoref:t.videoref,description:Et.deserialize(t.description)});if(r.audioref!==void 0||r.imgref!==void 0||r.textref!==void 0||r.videoref!==void 0||r.text!==void 0||r.children!==void 0)return r}static deserializeArray(t){if(Array.isArray(t))return t.map(t=>e.deserialize(t)).filter(e=>e!==void 0)}serialize(){let e={};if(this.id!==void 0&&(e.id=this.id),this.audioref!==void 0&&(e.audioref=this.audioref),this.children!==void 0&&(e.children=this.children.map(e=>e.serialize())),this.imgref!==void 0&&(e.imgref=this.imgref),this.role!==void 0&&(e.role=f(this.role)),this.text!==void 0){let t=this.text.serialize();t!==void 0&&(e.text=t)}return this.textref!==void 0&&(e.textref=this.textref),this.videoref!==void 0&&(e.videoref=this.videoref),this.description!==void 0&&(e.description=this.description.serialize()),e}get audioFile(){return this.audioref?.split(`#`)[0]}get audioTime(){if(this.audioref?.includes(`#`))return this.audioref.split(`#`,2)[1]}get textFile(){return this.textref?.split(`#`)[0]}get fragmentId(){if(this.textref?.includes(`#`))return this.textref.split(`#`,2)[1]}get clip(){let e=this.audioFile;if(!e)return;let t=this.audioTime,n={audioResource:e,fragmentId:this.fragmentId};if(!t)return n;let r=this.parseTimer(t);return n.start=r[0],n.end=r[1],n}parseTimer(e){if(!e||!e.startsWith(`t=`))return[void 0,void 0];let t=e.substring(2).split(`,`).map(e=>parseFloat(e));return t.length===1?[isNaN(t[0])?void 0:t[0],void 0]:t.length>2?[void 0,void 0]:[isNaN(t[0])?void 0:t[0],isNaN(t[1])?void 0:t[1]]}},Ot=class{constructor(e){this.fetcher=new i,this.guides=new Map,e.fetcher&&(this.fetcher=e.fetcher),this.manifest=e.manifest,this.context=e.manifest.context,this.metadata=e.manifest.metadata,this.links=e.manifest.links,this.readingOrder=e.manifest.readingOrder,this.resources=e.manifest.resources,this.toc=e.manifest.toc,this.subcollections=e.manifest.subcollections}get timeline(){return this._timeline||(this._timeline=dt(this)),this._timeline}get baseURL(){return this.manifest.baseURL}linkWithHref(e){return this.manifest.linkWithHref(e)}linksWithRole(e){let t=this.subcollections?.get(e);return t&&t.length>0?t[0].links:void 0}linksWithRel(e){return this.manifest.linksWithRel(e)}linkWithRel(e){return this.manifest.linkWithRel(e)}getCover(){let e=[this.links,this.resources,this.readingOrder].filter(Boolean);for(let t of e){let e=t.items.find(e=>e.rels?.has(`cover`));if(e)return e}for(let t of e){let e=t.items.find(e=>e.mediaType.isBitmap||e.mediaType.matches(k.SVG));if(e)return e}}async positionsFromManifest(){let e=this.manifest.links?.findWithMediaType(`application/vnd.readium.position-list+json`);if(e===void 0)return[];let t=await this.get(e).readAsJSON();return t.total?t.positions.map(e=>M.deserialize(e)).filter(e=>e!==void 0):[]}async guideForLink(e,t){let n=e=>e.alternates?.findWithMediaType(`application/guided-navigation+json`),r=n(e);if(!r){let t=this.linkWithHref(e.href);t!==void 0&&(r=n(t))}if(r){let n=await this.fetchGuide(r,e);if(!t?.skipAudio||!n||!kt(n.guided))return n}let i=this.manifest.links?.findWithMediaType(`application/guided-navigation+json`);if(!i)return;let a=await this.fetchGuide(i,e);if(!(t?.skipAudio&&a&&kt(a.guided)))return a}fetchGuide(e,t){let n=e.href;if(e.templated){let e=new ot(n),r={};return e.parameters.has(`ref`)&&(r.ref=t.href.split(`#`)[0]),this.loadGuide(e.expand(r))}let r=this.guides.get(n);return r||(r=this.loadGuide(n),this.guides.set(n,r),r.catch(()=>this.guides.delete(n))),r}async loadGuide(e){let t=await this.get(new N({href:e})).readAsJSON();return wt.deserialize(t)}get(e){return this.fetcher.get(e)}};function kt(e){return!!e?.some(e=>e.audioref!==void 0||kt(e.children))}function At(e){return typeof e==`object`&&!!e&&e.nodeType===Node.ELEMENT_NODE}var jt={NONE:``,DESCENDANT:` `,CHILD:` > `},z={id:`id`,class:`class`,tag:`tag`,attribute:`attribute`,nthchild:`nthchild`,nthoftype:`nthoftype`};function Mt(e,t){return Object.values(e).includes(t)}var Nt=`CssSelectorGenerator`;function Pt(e=`unknown problem`,...t){console.warn(`${Nt}: ${e}`,...t)}var Ft={selectors:[z.id,z.class,z.tag,z.attribute],includeTag:!1,whitelist:[],blacklist:[],combineWithinSelector:!0,combineBetweenSelectors:!0,root:null,maxCombinations:1/0,maxCandidates:1/0,useScope:!1,ignoreGeneratedClassNames:!1};function It(e){return!!e}function Lt(e){return Array.isArray(e)?e.filter(e=>Mt(z,e)):[]}function Rt(e){return e instanceof RegExp}function zt(e){return[`string`,`function`].includes(typeof e)||Rt(e)}function Bt(e){return Array.isArray(e)?e.filter(zt):[]}function Vt(e){return typeof e==`object`&&!!e&&`nodeType`in e&&typeof e.nodeType==`number`}function Ht(e){let t=[Node.DOCUMENT_NODE,Node.DOCUMENT_FRAGMENT_NODE,Node.ELEMENT_NODE];return Vt(e)&&t.includes(e.nodeType)}function Ut(e,t){if(Ht(e))return e.contains(t)||Pt(`element root mismatch`,"Provided root does not contain the element. This will most likely result in producing a fallback selector using element's real root node. If you plan to use the selector using provided root (e.g. `root.querySelector`), it will not work as intended."),e;let n=t.getRootNode({composed:!1});return Ht(n)?(n.nodeType!==Node.DOCUMENT_NODE&&Pt(`shadow root inferred`,"You did not provide a root and the element is a child of Shadow DOM. This will produce a selector using ShadowRoot as a root. If you plan to use the selector using document as a root (e.g. `document.querySelector`), it will not work as intended."),n):en(t)}function Wt(e){return typeof e==`number`?e:1/0}function Gt(e,t={}){let n=Object.assign(Object.assign({},Ft),t);return{selectors:Lt(n.selectors),whitelist:Bt(n.whitelist),blacklist:Bt(n.blacklist),root:Ut(n.root,e),combineWithinSelector:It(n.combineWithinSelector),combineBetweenSelectors:It(n.combineBetweenSelectors),includeTag:It(n.includeTag),maxCombinations:Wt(n.maxCombinations),maxCandidates:Wt(n.maxCandidates),useScope:It(n.useScope),maxResults:Wt(n.maxResults),ignoreGeneratedClassNames:It(n.ignoreGeneratedClassNames)}}function Kt(e=[]){let[t=[],...n]=e;return n.length===0?t:n.reduce((e,t)=>{let n=new Set(t);return e.filter(e=>n.has(e))},t)}function qt(e){return[].concat(...e)}function Jt(e){return e.replace(/[|\\{}()[\]^$+?.]/g,`\\$&`).replace(/\*/g,`.+`)}function Yt(e){let t=e.map(e=>{if(Rt(e))return t=>e.test(t);if(typeof e==`function`)return t=>{let n=e(t);return typeof n==`boolean`?n:(Pt(`pattern matcher function invalid`,`Provided pattern matching function does not return boolean. It's result will be ignored.`,e),!1)};if(typeof e==`string`){let t=RegExp(`^`+Jt(e)+`$`);return e=>t.test(e)}return Pt(`pattern matcher invalid`,`Pattern matching only accepts strings, regular expressions and/or functions. This item is invalid and will be ignored.`,e),()=>!1});return e=>t.some(t=>t(e))}function Xt(e,t,n){let r=Ut(n,e[0]).querySelectorAll(t);if(r.length!==e.length)return!1;let i=new Set(r);return e.every(e=>i.has(e))}function Zt(e,t){t=t??en(e);let n=[],r=e;for(;r&&r!==t;)At(r)&&n.push(r),r=r.parentNode;return n}function Qt(e,t){return Kt(e.map(e=>Zt(e,t)))}function $t(e){return typeof e==`object`&&!!e&&`nodeType`in e&&e.nodeType===Node.DOCUMENT_FRAGMENT_NODE&&`host`in e}function en(e){return e.ownerDocument.querySelector(`:root`)}var tn=RegExp(`^$|\\s`),nn=RegExp(`^$`),rn=[z.nthoftype,z.tag,z.id,z.class,z.attribute,z.nthchild],an=Yt([`class`,`id`,`ng-*`]);function on({name:e}){return`[${e}]`}function sn({name:e,value:t}){return`[${e}='${t}']`}function cn({nodeName:e,nodeValue:t},n){let r=n.tagName.toLowerCase();return[`input`,`option`].includes(r)&&e===`value`||e===`src`&&t?.startsWith(`data:`)?!1:!an(e)}function ln({nodeName:e,nodeValue:t}){return{name:jn(e),value:jn(t??void 0)}}function un(e,t){let n=Array.from(e.attributes).filter(t=>cn(t,e)).map(ln);return[...n.map(on),...n.map(sn)]}function dn(e,t){return Kt(e.map(e=>un(e)))}var fn=/^[a-z_-]{3,}$/i,pn=/[bcdfghjklmnpqrstvwxyz]{4,}/i;function mn(e){if(!fn.test(e)||e.includes(`_`)&&!e.includes(`__`)||/^(css|sc|jsx|emotion|makeStyles|MuiButton|MuiBox)-/i.test(e))return!1;let t=e.split(RegExp(`--|__|[-]|(?<=[a-z])(?=[A-Z])`)).filter(e=>e.length>0);if(t.length===0||t.length===1&&t[0].length<4)return!1;for(let e of t)if(e.length<=2||pn.test(e))return!1;return!0}function hn(e,t){let n=(e.getAttribute(`class`)??``).trim().split(/\s+/).filter(e=>!nn.test(e)),r=n;if(t?.ignoreGeneratedClassNames){let e=Yt(t.whitelist);r=n.filter(t=>{let n=`.${jn(t)}`;return e(n)?!0:mn(t)})}return r.map(e=>`.${jn(e)}`)}function gn(e,t){return Kt(e.map(e=>hn(e,t)))}function _n(e,t){let n=e.getAttribute(`id`)??``,r=`#${jn(n)}`,i=e.getRootNode({composed:!1});return!tn.test(n)&&Xt([e],r,i)?[r]:[]}function vn(e,t){return e.length===0||e.length>1?[]:_n(e[0])}function yn(e,t){let n=e.parentNode,r=n&&`children`in n?n.children:null;if(r){for(let t=0;t<r.length;t++)if(r[t]===e)return[`:nth-child(${String(t+1)})`]}return[]}function bn(e,t){return Kt(e.map(e=>yn(e)))}function xn(e,t){return[jn(e.tagName.toLowerCase())]}function Sn(e,t){let n=[...new Set(qt(e.map(e=>xn(e))))];return n.length===0||n.length>1?[]:[n[0]]}function Cn(e,t){let n=Sn([e])[0],r=e.parentNode,i=r&&`children`in r?r:null;if(i){let t=Array.from(i.children).filter(e=>e.tagName.toLowerCase()===n).indexOf(e);if(t>-1)return[`${n}:nth-of-type(${String(t+1)})`]}return[]}function wn(e,t){return Kt(e.map(e=>Cn(e)))}function*Tn(e=[],{maxResults:t=1/0}={}){let n=0,r=On(1);for(;r.length<=e.length&&n<t;){n+=1;let t=Array(r.length);for(let n=0;n<r.length;n++)t[n]=e[r[n]];yield t,r=Dn(r,e.length-1)}}function En(e=[],{maxResults:t=1/0}={}){return Array.from(Tn(e,{maxResults:t}))}function Dn(e=[],t=0){let n=e.length;if(n===0)return e;let r=n-1;for(;r>=0&&e[r]===t-(n-1-r);)--r;if(r<0)return On(n+1);e[r]+=1;for(let t=r+1;t<n;t++)e[t]=e[t-1]+1;return e}function On(e=1){let t=Array(e);for(let n=0;n<e;n++)t[n]=n;return t}function*kn(e={}){let t=Object.entries(e);if(t.length===0)return;let n=[{index:t.length-1,partial:{}}];for(;n.length>0;){let e=n.pop();if(!e)break;let{index:r,partial:i}=e;if(r<0){yield i;continue}let[a,o]=t[r];for(let e=o.length-1;e>=0;e--)n.push({index:r-1,partial:Object.assign(Object.assign({},i),{[a]:o[e]})})}}var An=/[ !"#$%&'()[\]{|}<>*+,./;=?@^`~\\]/;function jn(e=``){return CSS?CSS.escape(e):Mn(e)}function Mn(e=``){return e.split(``).map(e=>e===`:`?`\\3A `:An.test(e)?`\\${e}`:escape(e).replace(/%/g,`\\`)).join(``)}var Nn={tag:Sn,id:vn,class:gn,attribute:dn,nthchild:bn,nthoftype:wn},Pn={tag:xn,id:_n,class:hn,attribute:un,nthchild:yn,nthoftype:Cn};function Fn(e,t,n){return Pn[t](e,n)}function In(e,t,n){let r=Nn[t];return r(e,n)}function Ln(e=[],t,n){return e.filter(e=>n(e)||!t(e))}function Rn(e=[],t){return e.sort((e,n)=>{let r=t(e),i=t(n);return r&&!i?-1:!r&&i?1:0})}function zn(){let e=new Map,t;return(n,r)=>{if(n.length!==1)return t??(t=Vn(n,r));let[i]=n,a=e.get(i);return a||(a=Vn(n,r),e.set(i,a)),a}}function*Bn(e,t,n=zn()){let r=new Set,i=n(e,t);for(let e of Gn(i,t))r.has(e)||(r.add(e),yield e)}function Vn(e,t){let{blacklist:n,whitelist:r,combineWithinSelector:i,maxCombinations:a}=t,o=Yt(n),s=Yt(r);return Hn(t).reduce((n,r)=>{let c=Rn(Ln(In(e,r,t),o,s),s);return n[r]=i?Array.from(Tn(c,{maxResults:a})):c.map(e=>[e]),n},{})}function Hn(e){let{selectors:t,includeTag:n}=e,r=[...t];return n&&!r.includes(`tag`)&&r.push(`tag`),r}function Un(e){return e.includes(z.tag)||e.includes(z.nthoftype)?[...e]:[...e,z.tag]}function Wn(e){let{selectors:t,combineBetweenSelectors:n,includeTag:r,maxCandidates:i}=e,a=n?En(t,{maxResults:i}):t.map(e=>[e]);return r?a.map(Un):a}function*Gn(e,t){for(let n of Wn(t))yield*Kn(n,e)}function*Kn(e,t){let n={};for(let r of e){let e=t[r];e&&e.length>0&&(n[r]=e)}for(let e of kn(n))yield Jn(e)}function qn(e,t){return t[e]?t[e].join(``):``}function Jn(e={}){let t=[...rn];return e[z.tag]&&e[z.nthoftype]&&t.splice(t.indexOf(z.tag),1),t.map(t=>qn(t,e)).join(``)}function Yn(e,t){return[...e.map(e=>t+jt.DESCENDANT+e),...e.map(e=>t+jt.CHILD+e)]}function*Xn(e,t){if(t===``)yield*e;else for(let n of e)yield*Yn([n],t)}function*Zn(e,t,n=``,r,i=zn()){let a=Bn(e,r,i);for(let r of Xn(a,n))Xt(e,r,t)&&(yield r)}function*Qn(e,t,n=``,r,i=zn()){if(e.length===0)return null;let a=[e.length>1?e:[],...Qt(e,t).map(e=>[e])];for(let e of a)for(let a of Zn(e,t,n,r,i))yield{foundElements:e,selector:a}}function*$n({elements:e,root:t,rootSelector:n=``,options:r}){let i=t,a=n,o=!0,s=zn();for(;o;){let n=!1;for(let o of Qn(e,i,a,r,s)){let{foundElements:r,selector:s}=o;if(n=!0,Xt(e,s,t))yield s;else{i=r[0],a=s;break}}n||(o=!1)}}function er(e){(e instanceof NodeList||e instanceof HTMLCollection)&&(e=Array.from(e));let t=(Array.isArray(e)?e:[e]).filter(At);return[...new Set(t)]}function tr(e){return{value:e,include:!1}}function nr(e,t,n=jt.NONE){let r={};return t.forEach(t=>{Reflect.set(r,t,Fn(e,t).map(tr))}),{element:e,operator:n,selectors:r}}function rr({selectors:e,operator:t}){let n=[...rn];e[z.tag]&&e[z.nthoftype]&&(n=n.filter(e=>e!==z.tag));let r=``;return n.forEach(t=>{(e[t]??[]).forEach(({value:e,include:t})=>{t&&(r+=e)})}),t+r}function ir(e,t){let n=Zt(e,t).reverse(),r=$t(t),i=n.map((e,t)=>{let n=nr(e,[z.nthchild],r&&t===0?jt.NONE:jt.CHILD);return(n.selectors.nthchild??[]).forEach(e=>{e.include=!0}),n});return[r?``:t?`:scope`:`:root`,...i.map(rr)].join(``)}function ar(e,t){return e.map(e=>ir(e,t)).join(`, `)}var or=function(e,t){var n={};for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(e!=null&&typeof Object.getOwnPropertySymbols==`function`)for(var i=0,r=Object.getOwnPropertySymbols(e);i<r.length;i++)t.indexOf(r[i])<0&&Object.prototype.propertyIsEnumerable.call(e,r[i])&&(n[r[i]]=e[r[i]]);return n};function sr(e,t={}){return cr(e,Object.assign(Object.assign({},t),{maxResults:1})).next().value}function*cr(e,t={}){let n=er(e),r=Gt(n[0],t),i=r.root??en(n[0]),a=0;for(let e of $n({elements:n,options:r,root:i,rootSelector:``}))if(yield e,a++,a>=r.maxResults)return;if(n.length>1){let{maxResults:e}=t,i=or(t,[`maxResults`]);if(yield n.map(e=>sr(e,i)).join(`, `),a++,a>=r.maxResults)return}let o=t.root!==void 0;yield ar(n,r.useScope||o?i:void 0)}var lr=2**32,ur=()=>Math.round(Math.random()*lr).toString(36),dr=()=>`${Math.round(performance.now())}-${ur()}-${ur()}`,fr=class{constructor(e){this.destination=null,this.registrar=new Map,this.origin=``,this.channelId=``,this.receiver=this.receive.bind(this),this.preLog=[],this.wnd=e,e.addEventListener(`message`,this.receiver)}receive(e){if(e.source===null)throw Error(`Event source is null`);if(typeof e.data!=`object`)return;let t=e.data;if(!(!(`_readium`in t)||!t._readium||t._readium<=0)){if(t.key===`_ping`){if(!this.destination){if(this.destination=e.source,this.origin=e.origin,this.channelId=t._channel,t._readium!==1){t._readium>1?this.send(`error`,`received comms version ${t._readium} higher than 1`):this.send(`error`,`received comms version ${t._readium} lower than 1`),this.destination=null,this.origin=``,this.channelId=``;return}this.send(`_pong`,void 0),this.preLog.forEach(e=>this.send(`log`,e)),this.preLog=[]}return}if(this.channelId){if(t._channel!==this.channelId||e.origin!==this.origin)return}else return;this.handle(t)}}handle(e){let t=this.registrar.get(e.key);!t||t.length===0?e.strict&&this.send(`_unhandled`,e):t.forEach(t=>t.cb(e.data,t=>{this.send(`_ack`,t,e.id)}))}register(e,t,n){Array.isArray(e)||(e=[e]),e.forEach(e=>{let r=this.registrar.get(e);if(r&&r.length>=0){if(r.find(e=>e.module===t))throw Error(`Trying to register another callback for combination of event ${e} and module ${t}`);r.push({cb:n,module:t}),this.registrar.set(e,r)}else this.registrar.set(e,[{cb:n,module:t}])})}unregister(e,t){Array.isArray(e)||(e=[e]),e.forEach(e=>{let n=this.registrar.get(e);!n||n.length===0||n.splice(n.findIndex(e=>e.module===t),1)})}unregisterAll(e){this.registrar.forEach((t,n)=>this.registrar.set(n,t.filter(t=>t.module!==e)))}log(...e){this.destination?this.send(`log`,e):this.preLog.push(e)}get ready(){return!!this.destination}destroy(){this.destination=null,this.channelId=``,this.preLog=[],this.registrar.clear(),this.wnd.removeEventListener(`message`,this.receiver)}send(e,t,n=void 0,r=[]){if(!this.destination)throw Error(`Attempted to send comms message before destination has been initialized`);let i={_readium:1,_channel:this.channelId,id:n??dr(),key:e,data:t};try{this.destination.postMessage(i,{targetOrigin:this.origin,transfer:r})}catch(e){if(r.length>0)throw e;this.destination.postMessage(i,this.origin,r)}}};function pr(e){return e.split(``).reverse().join(``)}function mr(e,t,n){let r=pr(t);return n.map(n=>{let i=Math.max(0,n.end-t.length-n.errors);return{start:_r(pr(e.slice(i,n.end)),r,n.errors).reduce((e,t)=>n.end-t.end<e?n.end-t.end:e,n.end),end:n.end,errors:n.errors}})}function hr(e){return(e|-e)>>31&1}function gr(e,t,n,r){let i=e.P[n],a=e.M[n],o=r>>>31,s=t[n]|o,c=s|a,l=(s&i)+i^i|s,u=a|~(l|i),d=i&l,f=hr(u&e.lastRowMask[n])-hr(d&e.lastRowMask[n]);return u<<=1,d<<=1,d|=o,u|=hr(r)-o,i=d|~(c|u),a=u&c,e.P[n]=i,e.M[n]=a,f}function _r(e,t,n){if(t.length===0)return[];n=Math.min(n,t.length);let r=[],i=Math.ceil(t.length/32)-1,a={P:new Uint32Array(i+1),M:new Uint32Array(i+1),lastRowMask:new Uint32Array(i+1)};a.lastRowMask.fill(1<<31),a.lastRowMask[i]=1<<(t.length-1)%32;let o=new Uint32Array(i+1),s=new Map,c=[];for(let e=0;e<256;e++)c.push(o);for(let e=0;e<t.length;e+=1){let n=t.charCodeAt(e);if(s.has(n))continue;let r=new Uint32Array(i+1);s.set(n,r),n<c.length&&(c[n]=r);for(let e=0;e<=i;e+=1){r[e]=0;for(let i=0;i<32;i+=1){let a=e*32+i;a>=t.length||t.charCodeAt(a)===n&&(r[e]|=1<<i)}}}let l=Math.max(0,Math.ceil(n/32)-1),u=new Uint32Array(i+1);for(let e=0;e<=l;e+=1)u[e]=(e+1)*32;u[i]=t.length;for(let e=0;e<=l;e+=1)a.P[e]=-1,a.M[e]=0;for(let d=0;d<e.length;d+=1){let f=e.charCodeAt(d),p;f<c.length?p=c[f]:(p=s.get(f),typeof p>`u`&&(p=o));let m=0;for(let e=0;e<=l;e+=1)m=gr(a,p,e,m),u[e]+=m;if(u[l]-m<=n&&l<i&&(p[l+1]&1||m<0)){l+=1,a.P[l]=-1,a.M[l]=0;let e;if(l===i){let n=t.length%32;e=n===0?32:n}else e=32;u[l]=u[l-1]+e-m+gr(a,p,l,m)}else for(;l>0&&u[l]>=n+32;)--l;l===i&&u[l]<=n&&(u[l]<n&&r.splice(0,r.length),r.push({start:-1,end:d+1,errors:u[l]}),n=u[l])}return r}function vr(e,t,n){return mr(e,t,_r(e,t,n))}function yr(e,t,n){let r=0,i=[];for(;r!==-1;)r=e.indexOf(t,r),r!==-1&&(i.push({start:r,end:r+t.length,errors:0}),r+=1);return i.length>0?i:vr(e,t,n)}function br(e,t){return t.length===0||e.length===0?0:1-yr(e,t,t.length)[0].errors/t.length}function xr(e,t,n={}){if(t.length===0)return null;let r=yr(e,t,Math.min(256,t.length/2));if(r.length===0)return null;let i=r=>{let i=1-r.errors/t.length,a=n.prefix?br(e.slice(Math.max(0,r.start-n.prefix.length),r.start),n.prefix):1,o=n.suffix?br(e.slice(r.end,r.end+n.suffix.length),n.suffix):1,s=1;return typeof n.hint==`number`&&(s=1-Math.abs(r.start-n.hint)/e.length),(50*i+20*a+20*o+2*s)/92},a=r.map(e=>({start:e.start,end:e.end,score:i(e)}));return a.sort((e,t)=>t.score-e.score),a[0]}function Sr(e,t,n){let r=n===1?t:t-1;if(e.charAt(r).trim()!==``)return t;let i,a;if(n===2?(i=e.substring(0,t),a=i.trimEnd()):(i=e.substring(t),a=i.trimStart()),!a.length)return-1;let o=i.length-a.length;return n===2?t-o:t+o}function Cr(e,t){let n=e.commonAncestorContainer.ownerDocument.createNodeIterator(e.commonAncestorContainer,NodeFilter.SHOW_TEXT),r=t===1?e.startContainer:e.endContainer,i=t===1?e.endContainer:e.startContainer,a=n.nextNode();for(;a&&a!==r;)a=n.nextNode();t===2&&(a=n.previousNode());let o=-1,s=()=>{if(a=t===1?n.nextNode():n.previousNode(),a){let e=a.textContent;o=Sr(e,t===1?0:e.length,t)}};for(;a&&o===-1&&a!==i;)s();if(a&&o>=0)return{node:a,offset:o};throw RangeError(`No text nodes with non-whitespace text found in range`)}function wr(e){if(!e.toString().trim().length)throw RangeError(`Range contains no non-whitespace text`);if(e.startContainer.nodeType!==Node.TEXT_NODE)throw RangeError(`Range startContainer is not a text node`);if(e.endContainer.nodeType!==Node.TEXT_NODE)throw RangeError(`Range endContainer is not a text node`);let t=e.cloneRange(),n=!1,r=!1,i={start:Sr(e.startContainer.textContent,e.startOffset,1),end:Sr(e.endContainer.textContent,e.endOffset,2)};if(i.start>=0&&(t.setStart(e.startContainer,i.start),n=!0),i.end>0&&(t.setEnd(e.endContainer,i.end),r=!0),n&&r)return t;if(!n){let{node:e,offset:n}=Cr(t,1);e&&n>=0&&t.setStart(e,n)}if(!r){let{node:e,offset:n}=Cr(t,2);e&&n>0&&t.setEnd(e,n)}return t}function Tr(e){switch(e.nodeType){case Node.ELEMENT_NODE:case Node.TEXT_NODE:return e.textContent?.length??0;default:return 0}}function Er(e){let t=e.previousSibling,n=0;for(;t;)n+=Tr(t),t=t.previousSibling;return n}function Dr(e,...t){let n=t.shift(),r=e.ownerDocument.createNodeIterator(e,NodeFilter.SHOW_TEXT),i=[],a=r.nextNode(),o,s=0;for(;n!==void 0&&a;)o=a,s+o.data.length>n?(i.push({node:o,offset:n-s}),n=t.shift()):(a=r.nextNode(),s+=o.data.length);for(;n!==void 0&&o&&s===n;)i.push({node:o,offset:o.data.length}),n=t.shift();if(n!==void 0)throw RangeError(`Offset exceeds text length`);return i}var Or=class e{constructor(e,t){if(t<0)throw Error(`Offset is invalid`);this.element=e,this.offset=t}relativeTo(t){if(!t.contains(this.element))throw Error(`Parent is not an ancestor of current element`);let n=this.element,r=this.offset;for(;n!==t;)r+=Er(n),n=n.parentElement;return new e(n,r)}resolve(e={}){try{return Dr(this.element,this.offset)[0]}catch(t){if(this.offset===0&&e.direction!==void 0){let n=document.createTreeWalker(this.element.getRootNode(),NodeFilter.SHOW_TEXT);n.currentNode=this.element;let r=e.direction===1,i=r?n.nextNode():n.previousNode();if(!i)throw t;return{node:i,offset:r?0:i.data.length}}throw t}}static fromCharOffset(t,n){switch(t.nodeType){case Node.TEXT_NODE:return e.fromPoint(t,n);case Node.ELEMENT_NODE:return new e(t,n);default:throw Error(`Node is not an element or text node`)}}static fromPoint(t,n){switch(t.nodeType){case Node.TEXT_NODE:{if(n<0||n>t.data.length)throw Error(`Text node offset is out of range`);if(!t.parentElement)throw Error(`Text node has no parent`);let r=Er(t)+n;return new e(t.parentElement,r)}case Node.ELEMENT_NODE:{if(n<0||n>t.childNodes.length)throw Error(`Child node offset is out of range`);let r=0;for(let e=0;e<n;e++)r+=Tr(t.childNodes[e]);return new e(t,r)}default:throw Error(`Point is not in an element or text node`)}}},kr=class e{constructor(e,t){this.start=e,this.end=t}relativeTo(t){return new e(this.start.relativeTo(t),this.end.relativeTo(t))}toRange(){let e,t;this.start.element===this.end.element&&this.start.offset<=this.end.offset?[e,t]=Dr(this.start.element,this.start.offset,this.end.offset):(e=this.start.resolve({direction:1}),t=this.end.resolve({direction:2}));let n=new Range;return n.setStart(e.node,e.offset),n.setEnd(t.node,t.offset),n}static fromRange(t){let n=Or.fromPoint(t.startContainer,t.startOffset),r=Or.fromPoint(t.endContainer,t.endOffset);return new e(n,r)}static fromOffsets(t,n,r){return new e(new Or(t,n),new Or(t,r))}static trimmedRange(t){return wr(e.fromRange(t).toRange())}},Ar=class e{constructor(e,t,n){this.root=e,this.start=t,this.end=n}static fromRange(t,n){let r=kr.fromRange(n).relativeTo(t);return new e(t,r.start.offset,r.end.offset)}static fromSelector(t,n){return new e(t,n.start,n.end)}toSelector(){return{type:`TextPositionSelector`,start:this.start,end:this.end}}toRange(){return kr.fromOffsets(this.root,this.start,this.end).toRange()}},jr=class e{constructor(e,t,n={}){this.root=e,this.exact=t,this.context=n}static fromRange(t,n){let r=t.textContent,i=kr.fromRange(n).relativeTo(t),a=i.start.offset,o=i.end.offset;return new e(t,r.slice(a,o),{prefix:r.slice(Math.max(0,a-32),a),suffix:r.slice(o,Math.min(r.length,o+32))})}static fromSelector(t,n){let{prefix:r,suffix:i}=n;return new e(t,n.exact,{prefix:r,suffix:i})}toSelector(){return{type:`TextQuoteSelector`,exact:this.exact,prefix:this.context.prefix,suffix:this.context.suffix}}toRange(e={}){return this.toPositionAnchor(e).toRange()}toPositionAnchor(e={}){let t=this.root.textContent,n=xr(t,this.exact,{...this.context,hint:e.hint});if(!n)throw Error(`Quote not found`);return new Ar(this.root,n.start,n.end)}};function Mr(e){let t=e.tagName.toUpperCase();return t===`IMG`||t===`VIDEO`||t===`AUDIO`||t===`IFRAME`||t===`OBJECT`||t===`EMBED`||t===`CANVAS`}function Nr(e,t){let n=t&&$e(t),r=null;if(n)try{r=e.querySelector(n)}catch(e){console.warn(`Invalid cssSelector: ${n}`,e)}return r??e.body??e.documentElement}function Pr(e,t){let n;try{n=e.querySelector(t.cssSelector)}catch(e){return console.error(`Invalid domRange cssSelector: ${t.cssSelector}`,e),null}if(!n)return console.error(`Can't resolve domRange cssSelector: ${t.cssSelector}`),null;let r=0;for(let e of n.childNodes)if(e.nodeType===Node.TEXT_NODE){if(r===t.textNodeIndex)return{node:e,offset:t.charOffset};r++}return console.error(`Can't resolve domRange textNodeIndex ${t.textNodeIndex} for selector: ${t.cssSelector}`),null}function Fr(e,t){try{let n=t.locations,r=t.text;if(n){let t=et(n);if(t){let n=Pr(e,t.start),r=t.end?Pr(e,t.end):n;if(n&&r)try{let t=e.createRange();return n.offset===void 0?t.setStartBefore(n.node):t.setStart(n.node,n.offset),r.offset===void 0?t.setEndBefore(r.node):t.setEnd(r.node,r.offset),t}catch(e){console.warn(`Invalid domRange, falling back:`,e)}}}if(n){let t=tt(n);if(t){let r=Pe(t,e,Nr(e,n));if(r.length>0)return r[0]}}if(r&&r.highlight){let t=new jr(Nr(e,n),r.highlight,{prefix:r.before,suffix:r.after});try{return t.toRange()}catch{return console.warn(`Quote not found:`,t),null}}if(n){let t=null;if(!t&&$e(n)&&(t=e.querySelector($e(n))),!t&&n.fragments){for(let r of n.fragments)if(t=e.getElementById(Te(r)),t)break}if(t){let n=e.createRange();return t.childNodes.length===0||Mr(t)?(n.selectNode(t),n):(n.setStartBefore(t),n.setEndAfter(t),n)}}}catch(e){console.error(e)}return null}var Ir=class{},Lr=`readium-snapper-style`,Rr=`readium-navigation-lock-style`,zr=class e extends Ir{constructor(){super(...arguments),this.protected=!1,this.locked=!1,this.watchedRanges=[],this.watchedWithoutText=[],this.timelineEntries=new Map,this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts=new Map}static inDomOrder(e,t,n){let r=e.get(t),i=e.get(n);return!r||!i?0:r.compareDocumentPosition(i)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1}updateTimelineEntries(t,n){this.cachedFragmentIds=t,this.timelineEntries.clear(),this.cachedFragmentStarts.clear();for(let e of t){let t=n.document.getElementById(e);t&&this.timelineEntries.set(e,t)}this.sortedFragmentIds=Array.from(this.timelineEntries.keys()).sort((t,n)=>e.inDomOrder(this.timelineEntries,t,n)),this.refreshFragmentStarts()}refreshFragmentStarts(){for(let[e,t]of this.timelineEntries)this.cachedFragmentStarts.set(e,this.fragmentStart(t))}fragmentStart(e){return this.rectStart(e.getBoundingClientRect())}currentScrollExtent(){return{pos:0,size:0}}rectStart(e){return 0}lineStart(e){return this.rectStart(e)}registerTextLayout(t,n,r){this.textLayoutComms=n,n.register(`watch_text_layout`,r,(n,r)=>{let i=Array.isArray(n)?n:[];this.watchedRanges=i.map(n=>e.rangeOf(t,n)),this.watchedWithoutText=i.map(e=>!st.deserialize(Array.isArray(e)?e[0]:e)?.highlight),t.requestAnimationFrame(()=>this.sendTextLayout(!0)),r(!0)})}registerNavigationLock(e,t,n){t.register(`lock_navigation`,n,(t,n)=>{if(this.locked=t===!0,e.document.getElementById(Rr)?.remove(),this.locked){let t=e.document.createElement(`style`);t.dataset.readium=`true`,t.id=Rr,t.textContent=`
                :root {
                    overflow: hidden !important;
                    touch-action: none !important;
                }`,e.document.head.appendChild(t)}n(!0)})}unlockNavigation(e){this.locked=!1,e.document.getElementById(Rr)?.remove()}unwatchTextLayout(){this.watchedRanges=[],this.watchedWithoutText=[],this.textLayoutComms=void 0}sendTextLayout(e=!1){if(!this.textLayoutComms?.ready||this.watchedRanges.length===0)return;let t={viewport:this.currentScrollExtent()};e&&(t.pieces=this.watchedRanges.map((e,t)=>{if(!e)return null;let n=this.lineStarts(e);return this.watchedWithoutText[t]?{...n,text:e.toString()}:n})),this.textLayoutComms.send(`text_layout`,t)}static rangeOf(e,t){let[n,r]=Array.isArray(t)?t:[t];return Fr(e.document,new M({href:e.location.href,type:`text/html`,text:st.deserialize(n),locations:r?new j({otherLocations:new Map([[`cssSelector`,r]])}):void 0}))??null}lineStarts(e){let t=e.startContainer.ownerDocument,n={offsets:[],starts:[]},r=t.createTreeWalker(e.commonAncestorContainer,NodeFilter.SHOW_TEXT),i=r.currentNode.nodeType===Node.TEXT_NODE?r.currentNode:r.nextNode(),a=0,o=!1;for(;i;i=r.nextNode()){if(!e.intersectsNode(i)){if(a>0)break;continue}let r=i.textContent??``,s=i===e.startContainer?e.startOffset:0,c=i===e.endContainer?e.endOffset:r.length;if(s>=c)continue;let l=[];for(let e=s;e<c;e++){l.push(a);let t=/\s/.test(r[e]);t&&o||a++,o=t}let u=e=>{let n=t.createRange();n.setStart(i,e),n.setEnd(i,e+1);let r=n.getClientRects()[0];return r&&(r.width||r.height)?Math.round(this.lineStart(r)):void 0},d=(e,t)=>{n.starts.length>0&&n.starts[n.starts.length-1]===t||(n.offsets.push(l[e-s]),n.starts.push(t))},f=(e,t,n,r)=>{if(t===r)return;if(n-e===1)return d(n,r);let i=e+n>>1,a=u(i);for(;a===void 0&&++i<n;)a=u(i);if(a===void 0)return d(n,r);f(e,t,i,a),f(i,a,n,r)},p=s,m=u(p);for(;m===void 0&&++p<c;)m=u(p);if(m===void 0)continue;let h=c-1,g=u(h);for(;g===void 0&&--h>p;)g=u(h);d(p,m),g!==void 0&&f(p,m,h,g)}return n}nearestPrecedingTimelineEntry(e){let t;for(let n of this.sortedFragmentIds){let r=this.timelineEntries.get(n),i=r.compareDocumentPosition(e);if(r===e||r.contains(e)||(i&Node.DOCUMENT_POSITION_FOLLOWING)!==0)t=n;else break}return t}fragmentFromGeometry(){for(let e of this.sortedFragmentIds){let t=this.timelineEntries.get(e);if(this.inCenterBand(t))return e}let e;for(let t of this.sortedFragmentIds){let n=this.timelineEntries.get(t);if(this.hasScrolledPast(n))e=t;else break}return e}firstFragmentIfReached(){let e=this.sortedFragmentIds[0];if(e===void 0)return;let t=this.timelineEntries.get(e);return this.hasScrolledPast(t)?e:void 0}currentTimelineFragment(){let{pos:e,size:t}=this.currentScrollExtent(),n=e+t/2,r;for(let e of this.sortedFragmentIds){let t=this.cachedFragmentStarts.get(e);if(t!==void 0){if(t<=n)r=e;else break}}return r}sortedVisibleFragmentIds(){let{pos:e,size:t}=this.currentScrollExtent(),n=e+t,r=-1,i=-1;for(let t=0;t<this.sortedFragmentIds.length;t++){let a=this.cachedFragmentStarts.get(this.sortedFragmentIds[t]);a!==void 0&&(a<=e&&(r=t),a<n&&(i=t))}return r<0&&(r=0),i<r?[]:this.sortedFragmentIds.slice(r,i+1)}inCenterBand(e){return!1}buildStyles(){return`
        html, body {
            touch-action: manipulation;
            user-select: ${this.protected?`none`:`auto`};
        }`}mount(t,n){let r=t.document.createElement(`style`);return r.dataset.readium=`true`,r.id=Lr,r.textContent=this.buildStyles(),t.document.head.appendChild(r),n.register(`protect`,e.moduleName,(e,t)=>{this.protected=!0,r.textContent=this.buildStyles(),t(!0)}),n.register(`unprotect`,e.moduleName,(e,t)=>{this.protected=!1,r.textContent=this.buildStyles(),t(!0)}),n.log(`Snapper Mounted`),!0}unmount(e,t){return e.document.getElementById(Lr)?.remove(),this.timelineEntries.clear(),this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts.clear(),t.log(`Snapper Unmounted`),!0}};zr.moduleName=`snapper`,zr.CENTER_TOLERANCE=.01;var B=zr;function Br(e){return(e.document.documentElement.dir||e.document.body.dir).toLowerCase()===`rtl`}function Vr(e,t){return e.getComputedStyle(t).direction===`rtl`}function Hr(e){return(e.getComputedStyle(e.document.documentElement).writingMode||e.getComputedStyle(e.document.body).writingMode)===`vertical-lr`}function Ur(e){let t=e.getComputedStyle(e.document.documentElement).writingMode||e.getComputedStyle(e.document.body).writingMode;return t===`vertical-rl`||t===`vertical-lr`}var Wr=2147483646;function V(e,t){let n=Ur(e),r=n&&Hr(e),i=e.innerWidth,a=e.innerHeight,o=e.document.scrollingElement,s=o.scrollLeft,c=o.scrollTop,l=parseInt(e.getComputedStyle(e.document.documentElement).getPropertyValue(`column-count`)),u=t?.getBoundingClientRect(),d=u?-u.left:n&&!r?o.scrollWidth-i+s:s,f=u?-u.top:c;return{isVertical:n,isVertLR:r,viewportInlineSize:n?a:i,viewportBlockSize:n?i:a,pageInlineSize:n?a:i/(l||1),xDocOffset:d,yDocOffset:f,inlineScrollOffset:n?f:d,blockScrollOffset:n?d:f,inlineStart:e=>n?e.top:e.left,blockStart:e=>n?e.left:e.top,inlineSize:e=>n?e.height:e.width,blockSize:e=>n?e.width:e.height,applyPosition(e,t,r,i,a,o){e.style.position=`absolute`,e.style.zIndex=String(Wr),n?(e.style.top=`${t*o}px`,e.style.left=`${r*o}px`,e.style.height=`${i*o}px`,e.style.width=`${a*o}px`):(e.style.left=`${t*o}px`,e.style.top=`${r*o}px`,e.style.width=`${i*o}px`,e.style.height=`${a*o}px`)},toRect(e,t,r,i){return n?new DOMRect(t,e,i,r):new DOMRect(e,t,r,i)}}}function Gr(e){return parseInt(e.getComputedStyle(e.document.documentElement).getPropertyValue(`column-count`))}function Kr(e){let t=getComputedStyle(e),n=parseFloat(t.paddingTop||`0`),r=parseFloat(t.paddingBottom||`0`);return e.clientHeight-n-r}function qr(e){let t=Gr(e);if(!t)return!1;let n=e.document.querySelectorAll(`div[id^='readium-virtual-page']`);for(let e of n)e.remove();let r=n.length,i=e.document.scrollingElement.scrollWidth,a=e.visualViewport.width,o=Math.round(i/a*t)%t,s=t===1||o===0?0:t-o;if(s>0)for(let t=0;t<s;t++){let n=e.document.createElement(`div`);n.setAttribute(`id`,`readium-virtual-page-${t}`),n.dataset.readium=`true`,CSS.supports(`break-before`,`column`)?n.style.breakBefore=`column`:(CSS.supports(`break-inside`,`avoid-column`)&&(n.style.breakInside=`avoid-column`),n.style.height=Kr(e.document.documentElement)+`px`),n.innerHTML=`&#8203;`,e.document.body.appendChild(n)}return r!==s}function Jr(e){let t=e.document.createElement(`style`);t.appendChild(e.document.createTextNode(`*{}`)),e.document.body.appendChild(t),e.document.body.removeChild(t)}var Yr=()=>typeof window.CSSTransformValue<`u`,Xr=new Set([`backgroundColor`,`textColor`,`linkColor`,`visitedColor`,`primaryColor`,`secondaryColor`,`selectionBackgroundColor`,`selectionTextColor`,`blendFilter`,`darkenFilter`,`invertFilter`,`invertGaiji`]),Zr=/--(?:USER|RS)__([\w-]+)/g;function Qr(e,t){let n=e??``,r=t??``,i=new Set;for(let e of n.matchAll(Zr))i.add(e[1]);for(let e of r.matchAll(Zr))i.add(e[1]);for(let e of i)if(!Xr.has(e))return!0;return!1}function $r(e){let t={},n=e.document.documentElement.style;for(let r in e.document.documentElement.style)Object.hasOwn(n,r)&&!Number.isNaN(Number.parseInt(r))&&(t[n[r]]=n.getPropertyValue(n[r]));return t}function ei(e,t){let n=$r(e);Object.keys(n).forEach(n=>{t.hasOwnProperty(n)||ri(e,n)}),Object.entries(t).forEach(([t,r])=>{n[t]!==r&&ni(e,t,r)})}function ti(e,t){return e.document.documentElement.style.getPropertyValue(t)}function ni(e,t,n){e.document.documentElement.style.setProperty(t,n)}function ri(e,t){e.document.documentElement.style.removeProperty(t)}function ii(e){return e<.5?2*e*e:-1+(4-2*e)*e}function H(e){let t=e.getSelection();t&&t.removeAllRanges()}var ai=[`a`,`area`,`audio`,`button`,`canvas`,`details`,`input`,`label`,`option`,`select`,`submit`,`textarea`,`video`],oi=[`dialog`,`radiogroup`,`radio`,`menu`,`menuitem`];function si(e){return ci(e)?null:li(e)?e:e.parentElement?si(e.parentElement):null}function ci(e){return!e||e.closest(`[inert]`)!==null||e.hasAttribute(`disabled`)}function li(e){return e?e.role&&oi.includes(e.role)?!0:e.tagName.toLowerCase()===`iframe`?!1:e.tabIndex>=0||ai.includes(e.nodeName.toLowerCase())||e.hasAttribute(`contenteditable`)&&e.getAttribute(`contenteditable`)?.toLowerCase()!==`false`:!1}function ui(e,t){let n=di(e,e.document.body,t),r=e._readium_cssSelectorGenerator.getCssSelector(n,{selectors:[`tag`,`id`,`class`,`nthchild`,`nthoftype`,`attribute`]});return new M({href:`#`,type:`application/xhtml+xml`,locations:new j({otherLocations:new Map([[`cssSelector`,r]])}),text:new st({highlight:n.textContent||void 0})})}function di(e,t,n){for(var r=0;r<t.children.length;r++){let i=t.children[r];if(!mi(i)&&fi(e,i,n))return pi(e,i)?i:di(e,i,n)}return t}function fi(e,t,n){if(t===document.body||t===document.documentElement)return!0;if(!document||!document.documentElement||!document.body)return!1;let r=t.getBoundingClientRect();return n?r.bottom>0&&r.top<e.innerHeight:r.right>0&&r.left<e.innerWidth}function pi(e,t){let n=t.getBoundingClientRect();return n.top>=0&&n.left>=0&&n.bottom<=e.innerHeight&&n.right<=e.innerWidth}function mi(e){let t=getComputedStyle(e);if(t){let e=t.getPropertyValue(`display`);if(e!=`block`&&e!=`list-item`||t.getPropertyValue(`opacity`)===`0`)return!0}return!1}var hi={maxVelocity:200,minVariance:.01,historySize:20,minDirectionChanges:.2,maxConsistentScrolls:15},gi={maxVelocity:200,minVariance:1e-5,historySize:100,minDirectionChanges:.1,maxConsistentScrolls:20},_i={maxSelectionsPerSecond:500,minVariance:50,historySize:20},vi={enabled:!0,maxSelectionPercent:.1,minThreshold:100,absoluteMaxChars:5e3,historySize:20},yi=class{constructor(e={}){this.history=[],this.consistentScrollCount=0,this.options={...hi,...e}}analyze(e,t,n){if(n<=0)return!1;let r=Math.abs(t)/n,i=Date.now();if(this.history.push({timestamp:i,direction:e,velocity:r,distance:Math.abs(t)}),this.history=this.history.filter(e=>i-e.timestamp<2e3).slice(-(this.options.historySize||20)),this.history.length<3)return!1;if(r>this.options.maxVelocity)return this.resetAfterDetection(),!0;let a=this.history.map(e=>e.velocity),o=this.history.map(e=>e.distance),s=a.reduce((e,t)=>e+t,0)/a.length,c=o.reduce((e,t)=>e+t,0)/o.length,l=a.reduce((e,t)=>e+(t-s)**2,0)/a.length,u=o.reduce((e,t)=>e+(t-c)**2,0)/o.length;if(l<this.options.minVariance&&u<c*.1){if(this.consistentScrollCount++,this.consistentScrollCount>=(this.options.maxConsistentScrolls||10))return this.resetAfterDetection(),!0}else this.consistentScrollCount=Math.max(0,this.consistentScrollCount-1);let d=0,f=this.history[0].direction;for(let e=1;e<this.history.length;e++)this.history[e].direction!==f&&(d++,f=this.history[e].direction);return d/this.history.length>(this.options.minDirectionChanges||.3)&&(this.resetAfterDetection(),!0)}resetAfterDetection(){this.history=this.history.slice(-3),this.consistentScrollCount=0}clear(){this.history=[],this.consistentScrollCount=0}},bi=`readium-column-snapper-style`,xi=200,Si=class e extends B{constructor(){super(...arguments),this.isSnapProtectionEnabled=!1,this.patternAnalyzer=null,this.lastTurnTime=0,this.rtl=!1,this.shakeTimeout=0,this.snappingCancelled=!1,this.alreadyScrollLeft=0,this.overscroll=0,this.cachedScrollWidth=0,this.touchState=0,this.startingX=void 0,this.endingX=void 0,this.onTouchStarter=this.onTouchStart.bind(this),this.onTouchEnder=this.onTouchEnd.bind(this),this.onWidthChanger=this.onWidthChange.bind(this),this.onTouchMover=this.onTouchMove.bind(this)}doc(){return this.wnd.document.scrollingElement}scrollOffset(){let e=this.doc().scrollLeft;return e===0?this.alreadyScrollLeft:e}snapOffset(e){let t=e+(this.rtl?-1:1);return t-t%this.wnd.innerWidth}snapNormOffset(e){let t=e+1;return t-t%this.wnd.innerWidth}normScroll(){let e=this.doc().scrollLeft||(this.doc().style.transform?this.alreadyScrollLeft:0);return this.rtl?Math.abs(e):Math.max(0,this.wnd.scrollX>0?this.wnd.scrollX:e)}currentScrollExtent(){return{pos:this.normScroll(),size:this.wnd.innerWidth}}rectStart(e){return this.normScroll()+(this.rtl?this.wnd.innerWidth-e.right:e.left)}lineStart(e){let t=this.rectStart(e);return t-t%this.wnd.innerWidth}hasScrolledPast(e){let t=e.getBoundingClientRect();return this.rtl?t.left>=this.wnd.innerWidth:t.right<=0}currentTimelineFragment(){if(this.timelineEntries.size===0)return;let e=this.wnd.innerWidth,t;for(let n of this.sortedFragmentIds){let r=this.timelineEntries.get(n).getBoundingClientRect();if(this.rtl?r.right>0:r.left<e)t=n;else break}return t}sortedVisibleFragmentIds(){let e=this.wnd.innerWidth;return this.sortedFragmentIds.filter(t=>{let n=this.timelineEntries.get(t).getBoundingClientRect();return this.rtl?n.left<e&&n.right>0:n.right>0&&n.left<e})}reportProgress(e){let t=this.cachedScrollWidth,n=this.wnd.innerWidth,r=this.normScroll(),i=Math.max(1,t-n),a=Math.max(0,Math.min(1,r/i)),o=Math.max(0,Math.min(1,(r+n)/t));this.comms.send(`progress`,{start:a,end:o,fragmentId:e===void 0?this.currentTimelineFragment():e,visibleFragmentIds:this.sortedVisibleFragmentIds()}),this.sendTextLayout()}shake(){if(this.overscroll!==0||this.shakeTimeout!==0)return;let e=this.doc(),t=this.normScroll()<5,n=this.rtl?t?`readium-bounce-r`:`readium-bounce-l`:`readium-bounce-r`;e.classList.add(n);let r=this.scrollOffset();this.shakeTimeout=this.wnd.setTimeout(()=>{e.classList.remove(n),this.shakeTimeout=0,this.doc().scrollLeft=r},150)}takeOverSnap(){this.snappingCancelled=!0,this.clearTouches();let e=this.doc();this.overscroll=e.style.transform?.length>12?parseFloat(e.style.transform.slice(12).split(`px`)[0]):0}snapCurrentOffset(e=!1,t=!1){let n=this.doc(),r=Gr(this.wnd),i=this.cachedScrollWidth-this.wnd.innerWidth,a=Math.min(Math.max(0,this.normScroll()),i),o=this.dragOffset(),s=this.rtl?-o:o,c=this.wnd.innerWidth/3*(s>0?2:1),l=Math.min(i,Math.max(0,this.snapNormOffset(a+c))),u=this.rtl?-l:l,d=this.rtl?-a:a,f=u>d?`right`:`left`;if(this.checkSuspiciousSnap(f,Math.abs(u-d)),e&&u!==d){this.snappingCancelled=!1;let e=(e,t,n,r)=>n>r?t:e+(t-e)*ii(n/r),i=xi*r,a,o=r=>{if(this.snappingCancelled)return;a||(a=r);let s=r-a,c=e(this.overscroll,0,s,i),l=e(d,u,s,i);n.scrollLeft=l,this.overscroll!==0&&(Yr()?n.attributeStyleMap.set(`transform`,new CSSTransformValue([new CSSTranslate(CSS.px(-c),CSS.px(0),CSS.px(0))])):n.style.transform=`translate3d(${-c}px, 0px, 0px)`),s<i?this.wnd.requestAnimationFrame(o):(this.clearTouches(),n.style.removeProperty(`transform`),n.scrollLeft=u,t||this.reportProgress())};this.wnd.requestAnimationFrame(o)}else n.style.removeProperty(`transform`),this.wnd.requestAnimationFrame(()=>{n.scrollLeft=u,this.clearTouches(),t||this.reportProgress()})}dragOffset(){return(this.startingX??0)-(this.endingX??0)}clearTouches(){this.startingX=void 0,this.endingX=void 0,this.overscroll=0}onTouchStart(e){if(e.stopPropagation(),!this.locked){switch(this.takeOverSnap(),e.touches.length){case 1:break;case 2:this.onTouchEnd(e);return;default:this.onTouchEnd(e),this.comms.send(`tap_more`,e.touches.length);return}this.startingX=e.touches[0].clientX,this.alreadyScrollLeft=this.doc().scrollLeft,this.touchState=1}}onTouchEnd(e){if(this.touchState===2){let e=this.dragOffset(),t=this.normScroll(),n=this.cachedScrollWidth-this.wnd.innerWidth,r=this.rtl?-e:e;this.cachedScrollWidth<=this.wnd.innerWidth?(this.reportProgress(),r>5&&this.comms.send(`no_more`,void 0),r<-5&&this.comms.send(`no_less`,void 0)):t<5&&r<5?(this.alreadyScrollLeft=0,this.comms.send(`no_less`,void 0)):n-t<5&&r>5&&(this.alreadyScrollLeft=this.rtl?-n:n,this.comms.send(`no_more`,void 0)),this.snapCurrentOffset(!0),this.comms.send(`swipe`,e)}this.touchState=0}onWidthChange(){this.cachedScrollWidth=this.doc().scrollWidth,this.comms.ready&&(this.snapCurrentOffset(),this.sendTextLayout(!0))}onTouchMove(e){if(this.touchState===0)return;this.touchState===1&&(this.touchState=2,H(this.wnd)),this.endingX=e.touches[0].clientX;let t=this.dragOffset(),n=this.alreadyScrollLeft+t,r=this.rtl?-(this.cachedScrollWidth-this.wnd.innerWidth):0,i=this.rtl?0:this.cachedScrollWidth-this.wnd.innerWidth;n<r||n>i?(this.overscroll=n,Yr()?this.doc().attributeStyleMap.set(`transform`,new CSSTransformValue([new CSSTranslate(CSS.px(-n),CSS.px(0),CSS.px(0))])):this.doc().style.transform=`translate3d(${-n}px, 0px, 0px)`):(this.overscroll=0,this.doc().style.removeProperty(`transform`),this.doc().scrollLeft=n)}enableSnapProtection(){this.patternAnalyzer||(this.patternAnalyzer=new yi({maxVelocity:this.wnd.innerWidth,minVariance:.1,historySize:5,maxConsistentScrolls:3,minDirectionChanges:.3}),this.isSnapProtectionEnabled=!0,this.comms?.log(`Snap protection enabled`))}checkSuspiciousSnap(e,t){if(!this.isSnapProtectionEnabled||!this.patternAnalyzer)return;let n=Date.now(),r=n-(this.lastTurnTime||n);this.lastTurnTime=n,this.patternAnalyzer.analyze(e,t,r)&&this.comms?.send(`content_protection`,{type:`suspicious_snapping`,timestamp:Date.now(),event:null})}mount(t,n){if(this.wnd=t,this.comms=n,this.rtl=Br(t),!super.mount(t,n))return!1;t.navigator.epubReadingSystem&&(t.navigator.epubReadingSystem.layoutStyle=`paginated`);let r=t.document.createElement(`style`);r.dataset.readium=`true`,r.id=bi,r.textContent=`
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
        `,t.document.head.appendChild(r),this.resizeObserver=new ResizeObserver(()=>{t.requestAnimationFrame(()=>{t&&qr(t)}),this.onWidthChange()}),this.resizeObserver.observe(t.document.body),this.mutationObserver=new MutationObserver(e=>{for(let n of e)if(n.target===this.wnd.document.documentElement){let e=n.oldValue,r=n.target.getAttribute(`style`),i=/transform\s*:\s*([^;]+)/,a=e?.match(i),o=r?.match(i);(!a&&!o&&Qr(e,r)||a&&!o||a&&o&&a[1]!==o[1])&&(t.requestAnimationFrame(()=>{t&&qr(t)}),this.onWidthChange())}else t.requestAnimationFrame(()=>this.cachedScrollWidth=this.doc().scrollWidth)}),t.frameElement&&this.mutationObserver.observe(t.frameElement,{attributes:!0,attributeFilter:[`style`]}),this.mutationObserver.observe(t.document,{attributes:!0,attributeFilter:[`style`]}),this.mutationObserver.observe(t.document.documentElement,{attributes:!0,attributeFilter:[`style`]}),n.register(`scroll_protection`,e.moduleName,(e,t)=>{this.enableSnapProtection(),t(!0)});let i=e=>{let t=this.doc().scrollLeft;return this.doc().scrollLeft=this.snapOffset(e),t!==this.doc().scrollLeft},a=e=>{let n=this.doc().scrollLeft,r=this.snapNormOffset(Math.max(0,Math.min(this.cachedScrollWidth-t.innerWidth,e)));return this.doc().scrollLeft=-r,n!==this.doc().scrollLeft};return t.addEventListener(`orientationchange`,this.onWidthChanger),t.addEventListener(`resize`,this.onWidthChanger),t.requestAnimationFrame(()=>this.cachedScrollWidth=this.doc().scrollWidth),this.registerTextLayout(t,n,e.moduleName),this.registerNavigationLock(t,n,e.moduleName),n.register(`go_progression`,e.moduleName,(e,r)=>{let i=e;i<0||i>1?(n.send(`error`,{message:`go_progression must be given a position from 0.0 to 1.0`}),r(!1)):this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth;let e=(this.cachedScrollWidth-t.innerWidth)*i;this.rtl?this.doc().scrollLeft=-this.snapNormOffset(e):this.doc().scrollLeft=this.snapOffset(e),this.reportProgress(),H(this.wnd),r(!0)})}),n.register(`go_id`,e.moduleName,(e,n)=>{let r=t.document.getElementById(e);r?this.wnd.requestAnimationFrame(()=>{this.rtl?this.doc().scrollLeft=-this.snapNormOffset(this.rectStart(r.getBoundingClientRect())):this.doc().scrollLeft=this.snapOffset(r.getBoundingClientRect().left+t.scrollX);let i=e;this.reportProgress(this.timelineEntries.has(i)?i:this.nearestPrecedingTimelineEntry(r)),H(this.wnd),n(!0)}):n(!1)}),n.register(`go_text`,e.moduleName,(e,n)=>{let r=B.rangeOf(t,e);r?this.wnd.requestAnimationFrame(()=>{this.rtl?this.doc().scrollLeft=-this.snapNormOffset(this.rectStart(r.getBoundingClientRect())):this.doc().scrollLeft=this.snapOffset(r.getBoundingClientRect().left+t.scrollX),this.reportProgress(this.nearestPrecedingTimelineEntry(r.startContainer)),H(this.wnd),n(!0)}):n(!1)}),n.register(`go_end`,e.moduleName,(e,n)=>{this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth;let e;if(e=this.rtl?-this.snapNormOffset(this.cachedScrollWidth-t.innerWidth):this.snapOffset(this.cachedScrollWidth),this.doc().scrollLeft===e)return n(!1);this.doc().scrollLeft=e,this.reportProgress(this.sortedFragmentIds[this.sortedFragmentIds.length-1]),H(this.wnd),n(!0)})}),n.register(`go_start`,e.moduleName,(e,t)=>{this.wnd.requestAnimationFrame(()=>{if(this.doc().scrollLeft===0)return t(!1);this.doc().scrollLeft=0,this.reportProgress(this.firstFragmentIfReached()),H(this.wnd),t(!0)})}),n.register(`go_prev`,e.moduleName,(e,n)=>{this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth;let e;e=this.rtl?a(this.normScroll()-t.innerWidth):i(t.scrollX-t.innerWidth),this.reportProgress(),e&&(H(this.wnd),this.checkSuspiciousSnap(`left`,this.wnd.innerWidth)),n(e)})}),n.register(`go_next`,e.moduleName,(e,n)=>{this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth;let e;e=this.rtl?a(this.normScroll()+t.innerWidth):i(t.scrollX+t.innerWidth),this.reportProgress(),e&&(H(this.wnd),this.checkSuspiciousSnap(`right`,this.wnd.innerWidth)),n(e)})}),n.register(`unfocus`,e.moduleName,(e,t)=>{this.snappingCancelled=!0,H(this.wnd),t(!0)}),n.register(`shake`,e.moduleName,(e,t)=>{this.shake(),t(!0)}),n.register(`focus`,e.moduleName,(e,t)=>{this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth,this.snapCurrentOffset(!1,!0),this.reportProgress(),t(!0)})}),n.register(`first_visible_locator`,e.moduleName,(e,n)=>{let r=ui(t,!1);this.comms.send(`first_visible_locator`,r.serialize()),n(!0)}),n.register(`timeline_entries`,e.moduleName,(e,n)=>{this.updateTimelineEntries(Array.isArray(e)?e:[],t),t.requestAnimationFrame(()=>this.reportProgress()),n(!0)}),t.addEventListener(`touchstart`,this.onTouchStarter,{passive:!0}),t.addEventListener(`touchend`,this.onTouchEnder,{passive:!0}),t.addEventListener(`touchmove`,this.onTouchMover,{passive:!0}),t.document.addEventListener(`touchstart`,()=>{}),n.log(`ColumnSnapper Mounted`),!0}unmount(t,n){return this.snappingCancelled=!0,n.unregisterAll(e.moduleName),this.unwatchTextLayout(),this.unlockNavigation(t),this.resizeObserver.disconnect(),this.mutationObserver.disconnect(),this.patternAnalyzer&&(this.patternAnalyzer.clear(),this.patternAnalyzer=null,this.isSnapProtectionEnabled=!1),t.removeEventListener(`touchstart`,this.onTouchStarter),t.removeEventListener(`touchend`,this.onTouchEnder),t.removeEventListener(`touchmove`,this.onTouchMover),t.removeEventListener(`orientationchange`,this.onWidthChanger),t.removeEventListener(`resize`,this.onWidthChanger),t.document.getElementById(bi)?.remove(),this.timelineEntries.clear(),n.log(`ColumnSnapper Unmounted`),super.unmount(t,n)}};Si.moduleName=`column_snapper`;var Ci=Si,wi=`readium-scroll-snapper-style`,Ti=class e extends B{constructor(){super(...arguments),this.patternAnalyzer=null,this.lastScrollTime=0,this.isScrollProtectionEnabled=!1,this.initialScrollHandled=!1,this.isScrolling=!1,this.lastScrollTop=0,this.isResizing=!1,this.resizeDebounce=null,this.handleScroll=e=>{if(this.comms.ready&&!this.isResizing){if(!this.initialScrollHandled){this.lastScrollTop=this.doc().scrollTop,this.initialScrollHandled=!0,this.reportProgress();return}this.isScrolling||(this.isScrolling=!0,this.wnd.requestAnimationFrame(()=>{this.reportProgress();let t=this.doc().scrollTop,n=t-this.lastScrollTop;if(this.lastScrollTop=t,this.isScrollProtectionEnabled&&Math.abs(n)>5){let t=Date.now(),r=t-(this.lastScrollTime||t);if(this.patternAnalyzer&&this.patternAnalyzer.analyze(n>0?`down`:`up`,Math.abs(n),r)){let t=e.target&&`tagName`in e.target?{tagName:e.target.tagName}:null;this.comms?.send(`content_protection`,{type:`suspicious_scrolling`,timestamp:Date.now(),scrollDelta:n,scrollDirection:n>0?`down`:`up`,targetElement:t})}this.lastScrollTime=t}this.comms.send(`scroll`,n),this.isScrolling=!1}))}}}doc(){return this.wnd.document.scrollingElement}hasScrolledPast(e){let t=this.wnd.innerHeight/2;return e.getBoundingClientRect().top<=t+this.wnd.innerHeight*B.CENTER_TOLERANCE}inCenterBand(e){let t=e.getBoundingClientRect(),n=this.wnd.innerHeight/2,r=this.wnd.innerHeight*B.CENTER_TOLERANCE,i=n-r,a=n+r;return t.height===0?t.top<=a&&t.top>=i:Math.max(0,Math.min(t.bottom,a)-Math.max(t.top,i))/t.height>=B.CENTER_TOLERANCE}currentScrollExtent(){return{pos:this.doc().scrollTop,size:this.wnd.innerHeight}}rectStart(e){return e.top+this.doc().scrollTop}reportProgress(e){if(!this.comms.ready)return;let t=Math.ceil(this.doc().scrollTop),n=this.doc().scrollHeight,r=this.wnd.innerHeight,i=Math.max(0,Math.min(1,t/n)),a=Math.max(0,Math.min(1,(t+r)/n));this.comms.send(`progress`,{start:i,end:a,fragmentId:e===void 0?this.currentTimelineFragment():e,visibleFragmentIds:this.sortedVisibleFragmentIds()}),this.sendTextLayout()}enableScrollProtection(){this.patternAnalyzer||(this.patternAnalyzer=new yi(gi),this.isScrollProtectionEnabled=!0,this.comms?.log(`Scroll protection enabled`))}mount(t,n){this.wnd=t,this.comms=n,this.initialScrollHandled=!1,this.lastScrollTop=0,this.isResizing=!1,this.resizeDebounce&&(this.wnd.clearTimeout(this.resizeDebounce),this.resizeDebounce=null),t.navigator.epubReadingSystem&&(t.navigator.epubReadingSystem.layoutStyle=`scrolling`);let r=t.document.createElement(`style`);return r.dataset.readium=`true`,r.id=wi,r.textContent=`
        * {
            scrollbar-width: none; /* for Firefox */
        }

        body::-webkit-scrollbar {
            display: none; /* for Chrome, Safari, and Opera */
        }
        `,t.document.head.appendChild(r),this.resizeObserver=new ResizeObserver(()=>{this.resizeDebounce&&this.wnd.clearTimeout(this.resizeDebounce),this.isResizing=!0,this.resizeDebounce=this.wnd.setTimeout(()=>{this.isResizing=!1,this.resizeDebounce=null,this.refreshFragmentStarts(),this.reportProgress(),this.sendTextLayout(!0)},50)}),this.resizeObserver.observe(t.document.body),t.addEventListener(`scroll`,this.handleScroll,{passive:!0}),n.register(`force_webkit_recalc`,e.moduleName,()=>{Jr(this.wnd);let e=this.doc().scrollTop;e>1?this.doc().scrollTop=e-1:this.doc().scrollTop=e+1,this.doc().scrollTop=e}),this.registerTextLayout(t,n,e.moduleName),this.registerNavigationLock(t,n,e.moduleName),n.register(`go_progression`,e.moduleName,(e,t)=>{let r=e;r<0||r>1?(n.send(`error`,{message:`go_progression must be given a position from 0.0 to 1.0`}),t(!1)):this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=this.doc().offsetHeight*r,this.reportProgress(this.fragmentFromGeometry()),H(this.wnd),t(!0)})}),n.register(`go_id`,e.moduleName,(e,n)=>{let r=t.document.getElementById(e);r?this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=r.getBoundingClientRect().top+t.scrollY-t.innerHeight/2;let i=e;this.reportProgress(this.timelineEntries.has(i)?i:this.nearestPrecedingTimelineEntry(r)),H(this.wnd),n(!0)}):n(!1)}),n.register(`go_text`,e.moduleName,(e,n)=>{let r=B.rangeOf(t,e);r?this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=r.getBoundingClientRect().top+t.scrollY-t.innerHeight/2,this.reportProgress(this.nearestPrecedingTimelineEntry(r.startContainer)),H(this.wnd),n(!0)}):n(!1)}),n.register(`go_start`,e.moduleName,(e,t)=>{if(this.doc().scrollTop===0)return t(!1);this.doc().scrollTop=0,this.reportProgress(this.firstFragmentIfReached()),t(!0)}),n.register(`go_end`,e.moduleName,(e,t)=>{if(this.doc().scrollTop===this.doc().scrollHeight-this.doc().offsetHeight)return t(!1);this.doc().scrollTop=this.doc().scrollHeight-this.doc().offsetHeight,this.reportProgress(this.sortedFragmentIds[this.sortedFragmentIds.length-1]),t(!0)}),n.register(`unfocus`,e.moduleName,(e,t)=>{H(this.wnd),t(!0)}),n.register(`scroll_protection`,e.moduleName,(e,t)=>{this.enableScrollProtection(),t(!0)}),n.register([`go_next`,`go_prev`],e.moduleName,(e,t)=>t(!1)),n.register(`focus`,e.moduleName,(e,t)=>{this.reportProgress(),t(!0)}),n.register(`first_visible_locator`,e.moduleName,(e,n)=>{let r=ui(t,!0);this.comms.send(`first_visible_locator`,r.serialize()),n(!0)}),n.register(`timeline_entries`,e.moduleName,(e,n)=>{this.updateTimelineEntries(Array.isArray(e)?e:[],t),n(!0)}),n.log(`ScrollSnapper Mounted`),!0}unmount(t,n){return n.unregisterAll(e.moduleName),this.unwatchTextLayout(),this.unlockNavigation(t),this.resizeObserver.disconnect(),this.handleScroll&&t.removeEventListener(`scroll`,this.handleScroll),t.document.getElementById(wi)?.remove(),this.timelineEntries.clear(),this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts.clear(),this.patternAnalyzer&&(this.patternAnalyzer.clear(),this.patternAnalyzer=null,this.isScrollProtectionEnabled=!1),n.log(`ScrollSnapper Unmounted`),!0}};Ti.moduleName=`scroll_snapper`;var Ei=Ti,Di=class e extends B{constructor(){super(...arguments),this.patternAnalyzer=null,this.lastScrollTime=0,this.isScrollProtectionEnabled=!1,this.initialScrollHandled=!1,this.isScrolling=!1,this.lastScrollTop=0,this.isResizing=!1,this.resizeDebounce=null,this.handleScroll=e=>{if(this.comms.ready&&!this.isResizing){if(!this.initialScrollHandled){this.lastScrollTop=this.doc().scrollTop,this.initialScrollHandled=!0,this.reportProgress();return}this.isScrolling||(this.isScrolling=!0,this.wnd.requestAnimationFrame(()=>{this.reportProgress();let t=this.doc().scrollTop,n=t-this.lastScrollTop;if(this.lastScrollTop=t,this.isScrollProtectionEnabled&&Math.abs(n)>5){let t=Date.now(),r=t-(this.lastScrollTime||t);if(this.patternAnalyzer&&this.patternAnalyzer.analyze(n>0?`down`:`up`,Math.abs(n),r)){let t=e.target&&`tagName`in e.target?{tagName:e.target.tagName}:null;this.comms?.send(`content_protection`,{type:`suspicious_scrolling`,timestamp:Date.now(),scrollDelta:n,scrollDirection:n>0?`down`:`up`,targetElement:t})}this.lastScrollTime=t}this.comms.send(`scroll`,n),this.isScrolling=!1}))}}}doc(){return this.wnd.document.scrollingElement}hasScrolledPast(e){let t=this.wnd.innerHeight/2;return e.getBoundingClientRect().top<=t+this.wnd.innerHeight*B.CENTER_TOLERANCE}inCenterBand(e){let t=e.getBoundingClientRect(),n=this.wnd.innerHeight/2,r=this.wnd.innerHeight*B.CENTER_TOLERANCE,i=n-r,a=n+r;return t.height===0?t.top<=a&&t.top>=i:Math.max(0,Math.min(t.bottom,a)-Math.max(t.top,i))/t.height>=B.CENTER_TOLERANCE}currentScrollExtent(){return{pos:this.doc().scrollTop,size:this.wnd.innerHeight}}rectStart(e){return e.top+this.doc().scrollTop}reportProgress(e){if(!this.comms.ready)return;let t=Math.ceil(this.doc().scrollTop),n=this.doc().scrollHeight,r=this.wnd.innerHeight,i=Math.max(0,Math.min(1,t/n)),a=Math.max(0,Math.min(1,(t+r)/n));this.comms.send(`progress`,{start:i,end:a,fragmentId:e===void 0?this.currentTimelineFragment():e,visibleFragmentIds:this.sortedVisibleFragmentIds()}),this.sendTextLayout()}enableScrollProtection(){this.patternAnalyzer||(this.patternAnalyzer=new yi(gi),this.isScrollProtectionEnabled=!0,this.comms?.log(`Scroll protection enabled`))}mount(t,n){return this.wnd=t,this.comms=n,this.initialScrollHandled=!1,this.lastScrollTop=0,this.isResizing=!1,this.resizeDebounce&&(this.wnd.clearTimeout(this.resizeDebounce),this.resizeDebounce=null),this.resizeObserver=new ResizeObserver(()=>{this.resizeDebounce&&this.wnd.clearTimeout(this.resizeDebounce),this.isResizing=!0,this.resizeDebounce=this.wnd.setTimeout(()=>{this.isResizing=!1,this.resizeDebounce=null,this.refreshFragmentStarts(),this.reportProgress(),this.sendTextLayout(!0)},50)}),this.resizeObserver.observe(t.document.body),t.addEventListener(`scroll`,this.handleScroll,{passive:!0}),n.register(`force_webkit_recalc`,e.moduleName,()=>{Jr(this.wnd);let e=this.doc().scrollTop;e>1?this.doc().scrollTop=e-1:this.doc().scrollTop=e+1,this.doc().scrollTop=e}),this.registerTextLayout(t,n,e.moduleName),this.registerNavigationLock(t,n,e.moduleName),n.register(`go_progression`,e.moduleName,(e,t)=>{let r=e;r<0||r>1?(n.send(`error`,{message:`go_progression must be given a position from 0.0 to 1.0`}),t(!1)):this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=this.doc().offsetHeight*r,this.reportProgress(this.fragmentFromGeometry()),H(this.wnd),t(!0)})}),n.register(`go_id`,e.moduleName,(e,n)=>{let r=t.document.getElementById(e);r?this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=r.getBoundingClientRect().top+t.scrollY-t.innerHeight/2;let i=e;this.reportProgress(this.timelineEntries.has(i)?i:this.nearestPrecedingTimelineEntry(r)),H(this.wnd),n(!0)}):n(!1)}),n.register(`go_text`,e.moduleName,(e,n)=>{let r=B.rangeOf(t,e);r?this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=r.getBoundingClientRect().top+t.scrollY-t.innerHeight/2,this.reportProgress(this.nearestPrecedingTimelineEntry(r.startContainer)),H(this.wnd),n(!0)}):n(!1)}),n.register(`go_start`,e.moduleName,(e,t)=>{if(this.doc().scrollTop===0)return t(!1);this.doc().scrollTop=0,this.reportProgress(this.firstFragmentIfReached()),t(!0)}),n.register(`go_end`,e.moduleName,(e,t)=>{if(this.doc().scrollTop===this.doc().scrollHeight-this.doc().offsetHeight)return t(!1);this.doc().scrollTop=this.doc().scrollHeight-this.doc().offsetHeight,this.reportProgress(this.sortedFragmentIds[this.sortedFragmentIds.length-1]),t(!0)}),n.register(`unfocus`,e.moduleName,(e,t)=>{H(this.wnd),t(!0)}),n.register(`scroll_protection`,e.moduleName,(e,t)=>{this.enableScrollProtection(),t(!0)}),n.register([`go_next`,`go_prev`],e.moduleName,(e,t)=>t(!1)),n.register(`focus`,e.moduleName,(e,t)=>{this.reportProgress(),t(!0)}),n.register(`first_visible_locator`,e.moduleName,(e,r)=>{let i=ui(t,!0);n.send(`first_visible_locator`,i.serialize()),r(!0)}),n.register(`timeline_entries`,e.moduleName,(e,n)=>{this.updateTimelineEntries(Array.isArray(e)?e:[],t),n(!0)}),n.log(`WebPubSnapper Mounted`),!0}unmount(t,n){return n.unregisterAll(e.moduleName),this.unwatchTextLayout(),this.unlockNavigation(t),this.resizeObserver.disconnect(),this.handleScroll&&t.removeEventListener(`scroll`,this.handleScroll),this.patternAnalyzer&&(this.patternAnalyzer.clear(),this.patternAnalyzer=null,this.isScrollProtectionEnabled=!1),this.timelineEntries.clear(),this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts.clear(),n.log(`WebPubSnapper Unmounted`),!0}};Di.moduleName=`webpub_snapper`;var Oi=Di,ki=[`heading1`,`heading2`,`heading3`,`heading4`,`heading5`,`heading6`],Ai={"doc-abstract":`abstract`,"doc-acknowledgments":`acknowledgments`,"doc-afterword":`afterword`,"doc-appendix":`appendix`,article:`article`,"doc-backlink":`backlink`,"doc-biblioentry":`listItem`,"doc-bibliography":`bibliography`,"doc-biblioref":`biblioref`,blockquote:`blockquote`,caption:`caption`,cell:`cell`,"doc-chapter":`chapter`,"doc-colophon":`colophon`,columnheader:`columnheader`,complementary:`complementary`,"doc-conclusion":`conclusion`,"doc-cover":`cover`,"doc-credit":`credit`,"doc-credits":`credits`,"doc-dedication":`dedication`,definition:`definition`,"doc-endnote":`footnote`,"doc-endnotes":`endnotes`,"doc-epigraph":`epigraph`,"doc-epilogue":`epilogue`,"doc-errata":`errata`,"doc-example":`example`,figure:`figure`,"doc-footnote":`footnote`,"doc-foreword":`foreword`,"doc-glossary":`glossary`,"doc-glossref":`glossref`,img:`image`,image:`image`,"doc-index":`index`,"doc-introduction":`introduction`,list:`list`,listitem:`listItem`,main:`main`,math:`math`,navigation:`navigation`,"doc-noteref":`noteref`,"doc-notice":`notice`,"doc-pagebreak":`pagebreak`,"doc-pagelist":`pagelist`,paragraph:`paragraph`,"doc-part":`part`,"doc-preface":`preface`,"doc-prologue":`prologue`,"doc-pullquote":`pullquote`,grid:`table`,gridcell:`cell`,presentation:`presentation`,none:`presentation`,"doc-qna":`qna`,qna:`qna`,region:`region`,row:`row`,rowheader:`rowheader`,separator:`separator`,"doc-subtitle":`subtitle`,table:`table`,term:`term`,"doc-tip":`tip`,"doc-toc":`toc`},ji={abstract:`abstract`,acknowledgments:`acknowledgments`,afterword:`afterword`,appendix:`appendix`,aside:`aside`,backlink:`backlink`,biblioentry:`listItem`,bibliography:`bibliography`,biblioref:`biblioref`,"table-cell":`cell`,chapter:`chapter`,colophon:`colophon`,conclusion:`conclusion`,cover:`cover`,credit:`credit`,credits:`credits`,dedication:`dedication`,glossdef:`definition`,endnote:`footnote`,endnotes:`endnotes`,rearnote:`footnote`,rearnotes:`endnotes`,epigraph:`epigraph`,epilogue:`epilogue`,errata:`errata`,example:`example`,figure:`figure`,footnote:`footnote`,foreword:`foreword`,glossary:`glossary`,glossref:`glossref`,index:`index`,introduction:`introduction`,landmarks:`landmarks`,list:`list`,"list-item":`listItem`,loa:`loa`,loi:`loi`,lot:`lot`,lov:`lov`,noteref:`noteref`,notice:`notice`,pagebreak:`pagebreak`,"page-list":`pagelist`,pagelist:`pagelist`,part:`part`,preface:`preface`,prologue:`prologue`,pullquote:`pullquote`,qna:`qna`,"table-row":`row`,subtitle:`subtitle`,table:`table`,glossterm:`term`,tip:`tip`,toc:`toc`},Mi={abbr:`abbreviation`,acronym:`abbreviation`,article:`article`,aside:`aside`,audio:`audio`,blockquote:`blockquote`,caption:`caption`,figcaption:`caption`,td:`cell`,dd:`definition`,details:`details`,figure:`figure`,header:`header`,h1:`heading1`,h2:`heading2`,h3:`heading3`,h4:`heading4`,h5:`heading5`,h6:`heading6`,img:`image`,ul:`list`,ol:`list`,li:`listItem`,main:`main`,math:`math`,nav:`navigation`,p:`paragraph`,pre:`preformatted`,tr:`row`,section:`section`,hr:`separator`,summary:`summary`,table:`table`,dfn:`term`,dt:`term`,video:`video`,svg:`image`};[...ki];var Ni=new Set([`tr`,`td`,`th`]),Pi=new Set([`tr`,`thead`,`tbody`,`tfoot`]);function Fi(e){let t=e.getAttribute(`role`);if(!t)return!1;let n=t.split(/\s+/).filter(Boolean);return n.includes(`presentation`)||n.includes(`none`)}function Ii(e){return(e.getAttribute(`role`)??``).trim()!==``}function Li(e,t){if(!Ni.has(t)||Ii(e))return!1;for(let t=e.parentElement;t;t=t.parentElement){let e=t.tagName.toLowerCase();if(e!==`table`&&!Pi.has(e))return!1;if(Fi(t))return!0;if(e===`table`||Ii(t))return!1}return!1}function Ri(e,t){let n=e.getAttribute(`role`);return n?n.split(/\s+/).filter(Boolean).includes(t):!1}function zi(e){return e.tagName.toLowerCase()===`table`||Ri(e,`table`)||Ri(e,`grid`)||Ri(e,`treegrid`)}function Bi(e){return e.tagName.toLowerCase()===`tr`||Ri(e,`row`)}function Vi(e){let t=null;for(let n=e.parentElement;n;n=n.parentElement)if(zi(n)){t=n;break}return t?t.ownerDocument.createTreeWalker(t,NodeFilter.SHOW_ELEMENT,{acceptNode:e=>Bi(e)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}).nextNode()===e:!1}function Hi(e){let t=[],n=!1,r=e.getAttribute(`role`);if(r)for(let i of r.split(/\s+/).filter(Boolean))if((i===`presentation`||i===`none`)&&(n=!0),i===`heading`){let n=2,r=parseInt(e.getAttribute(`aria-level`)??``,10);Number.isFinite(r)&&r>=1&&(n=Math.min(r,6)),t.push(ki[n-1])}else Ai[i]&&t.push(Ai[i]);let i=e.getAttribute(`epub:type`);if(i)for(let e of i.split(/\s+/).filter(Boolean)){let n=ji[e];n&&t.push(n)}return{attrRoles:t,presentational:n}}function Ui(e){let t=[],n=e=>{t.includes(e)||t.push(e)},{attrRoles:r,presentational:i}=Hi(e),a=e.tagName.toLowerCase();if(i||Li(e,a))return[`presentation`];if(a===`body`)n(`body`);else if(a===`th`)switch(e.getAttribute(`scope`)){case`col`:n(`columnheader`);break;case`row`:n(`rowheader`);break;default:{let t=e.parentElement;t&&Vi(t)?n(`columnheader`):e.previousElementSibling===null?n(`rowheader`):n(`cell`)}}else{let e=Mi[a];e&&n(e)}for(let e of r)n(e);return t}function Wi(e,t){return Gi(e,t).flatMap(({rects:e})=>e)}function Gi(e,t){let n=t.map(e=>e.toUpperCase()),r=[],i=e.commonAncestorContainer,a=i.nodeType===Node.TEXT_NODE?i.parentNode:i,o=e.startContainer.ownerDocument.createTreeWalker(a,NodeFilter.SHOW_TEXT),s=o.nextNode();for(;s;){if(e.intersectsNode(s)){let t=s.parentNode,i=!1;for(;t;){if(t.nodeType===Node.ELEMENT_NODE&&n.includes(t.tagName.toUpperCase())){i=!0;break}t=t.parentNode}if(!i){let t=e.cloneRange();t.selectNode(s),t.compareBoundaryPoints(Range.START_TO_START,e)<0&&t.setStart(e.startContainer,e.startOffset),t.compareBoundaryPoints(Range.END_TO_END,e)>0&&t.setEnd(e.endContainer,e.endOffset);let n=Array.from(t.getClientRects(),e=>({left:e.left,right:e.right,top:e.top,bottom:e.bottom,width:e.width,height:e.height}));r.push({node:s,rects:n})}}s=o.nextNode()}return r}function Ki(e,t,n=!1,r=0){let i;if(Array.isArray(e))i=e;else{let t=e.getClientRects();t.length||e.commonAncestorContainer.nodeType===Node.ELEMENT_NODE&&(t=e.commonAncestorContainer.getClientRects()),i=[];for(let e of t)i.push({bottom:e.bottom,height:e.height,left:e.left,right:e.right,top:e.top,width:e.width})}if(r)for(let e of i)e.left-=r,e.top-=r,e.right+=r,e.bottom+=r,e.width+=r*2,e.height+=r*2;let a=Zi(Yi(qi(i,1,t,n),1));for(let e=a.length-1;e>=0;e--){let t=a[e];if(!(t.width*t.height>4)){if(a.length>1)a.splice(e,1);else break}}return a}function qi(e,t,n,r=!1){for(let i=0;i<e.length;i++)for(let a=i+1;a<e.length;a++){let o=e[i],s=e[a];if(o===s)continue;let c=W(o.top,s.top,t)&&W(o.bottom,s.bottom,t),l=W(o.left,s.left,t)&&W(o.right,s.right,t);if((l&&!n&&!r||c&&!l)&&ea(o,s,t)){let i=e.filter(e=>e!==o&&e!==s),a=Ji(o,s);return i.push(a),qi(i,t,n,r)}}return e}function Ji(e,t){let n=Math.min(e.left,t.left),r=Math.max(e.right,t.right),i=Math.min(e.top,t.top),a=Math.max(e.bottom,t.bottom);return{bottom:a,height:a-i,left:n,right:r,top:i,width:r-n}}function Yi(e,t){let n=new Set(e);for(let r of e)if(!(r.width>1&&r.height>1))n.delete(r);else for(let i of e)if(r!==i&&n.has(i)&&Xi(i,r,t)){n.delete(r);break}return Array.from(n)}function Xi(e,t,n){return U(e,t.left,t.top,n)&&U(e,t.right,t.top,n)&&U(e,t.left,t.bottom,n)&&U(e,t.right,t.bottom,n)}function U(e,t,n,r){return(e.left<t||W(e.left,t,r))&&(e.right>t||W(e.right,t,r))&&(e.top<n||W(e.top,n,r))&&(e.bottom>n||W(e.bottom,n,r))}function Zi(e){for(let t=0;t<e.length;t++)for(let n=t+1;n<e.length;n++){let r=e[t],i=e[n];if(r!==i&&ea(r,i,-1)){let t=[],n,a=Qi(r,i);if(a.length===1)t=a,n=r;else{let e=Qi(i,r);a.length<e.length?(t=a,n=r):(t=e,n=i)}let o=e.filter(e=>e!==n);return Array.prototype.push.apply(o,t),Zi(o)}}return e}function Qi(e,t){let n=$i(t,e);if(n.height===0||n.width===0)return[e];let r=[];{let t={bottom:e.bottom,height:0,left:e.left,right:n.left,top:e.top,width:0};t.width=t.right-t.left,t.height=t.bottom-t.top,t.height!==0&&t.width!==0&&r.push(t)}{let t={bottom:n.top,height:0,left:n.left,right:n.right,top:e.top,width:0};t.width=t.right-t.left,t.height=t.bottom-t.top,t.height!==0&&t.width!==0&&r.push(t)}{let t={bottom:e.bottom,height:0,left:n.left,right:n.right,top:n.bottom,width:0};t.width=t.right-t.left,t.height=t.bottom-t.top,t.height!==0&&t.width!==0&&r.push(t)}{let t={bottom:e.bottom,height:0,left:n.right,right:e.right,top:e.top,width:0};t.width=t.right-t.left,t.height=t.bottom-t.top,t.height!==0&&t.width!==0&&r.push(t)}return r}function $i(e,t){let n=Math.max(e.left,t.left),r=Math.min(e.right,t.right),i=Math.max(e.top,t.top),a=Math.min(e.bottom,t.bottom);return{bottom:a,height:Math.max(0,a-i),left:n,right:r,top:i,width:Math.max(0,r-n)}}function ea(e,t,n){return(e.left<t.right||n>=0&&W(e.left,t.right,n))&&(t.left<e.right||n>=0&&W(t.left,e.right,n))&&(e.top<t.bottom||n>=0&&W(e.top,t.bottom,n))&&(t.top<e.bottom||n>=0&&W(t.top,e.bottom,n))}function W(e,t,n){return Math.abs(e-t)<=n}var ta=class{constructor(e,t){this.window=e,this.copyHistory=[],this.lastSelectionLength=0,this.lastSelectionTime=0,this.options=t}cleanupOldHistory(e){this.copyHistory=this.copyHistory.filter(t=>e-t.timestamp<1e4),this.copyHistory.length>this.options.historySize&&(this.copyHistory=this.copyHistory.slice(-this.options.historySize))}isSuspiciousPattern(e){return this.copyHistory.length<3?!1:this.copyHistory.filter(t=>e-t.timestamp<2e3).length>=3||this.copyHistory.slice().sort((e,t)=>e.timestamp-t.timestamp).every((e,t,n)=>t===0||e.length>n[t-1].length*1.5)}shouldAllowCopy(e){if(!this.options.enabled)return!0;let t=this.window.getSelection();if(!t)return!0;let n=t.toString().length,r=this.window.document.body.innerText.length,i=Date.now();if(this.cleanupOldHistory(i),n<this.options.minThreshold)return this.copyHistory.push({timestamp:i,length:n,wasBlocked:!1}),!0;let a=i-this.lastSelectionTime<100&&n>this.lastSelectionLength*1.5,o=Math.min(r*this.options.maxSelectionPercent,this.options.absoluteMaxChars),s=this.isSuspiciousPattern(i),c=n>o||a||s;return this.copyHistory.push({timestamp:i,length:n,wasBlocked:c}),c?(e?.preventDefault(),!1):(this.lastSelectionLength=n,this.lastSelectionTime=i,!0)}destroy(){this.lastSelectionLength=0,this.lastSelectionTime=0,this.copyHistory=[],this.options.enabled=!1}},na=class{constructor(e=_i){this.options=e,this.events=[],this.selectionStartTime=0,this.lastSelectionTime=0,this.lastSelectionPosition=0,this.selectionPatterns=[],this.lastSelectedText=``}analyze(e){if(!e)return this.clear(),!1;let t=e.toString();if(t.length===0)return this.clear(),!1;if(e.type!==`Range`||!e.rangeCount)return!1;let n=Date.now();if(t.length<=50||t===this.lastSelectedText)return!1;if(this.selectionStartTime===0)return this.selectionStartTime=n,this.lastSelectedText=t,!1;if(n-this.selectionStartTime<500)return!1;n-this.lastSelectionTime>1e3&&(this.lastSelectionTime=n),this.selectionStartTime===0&&(this.selectionStartTime=n),this.lastSelectedText=t;let r=this.analyzeSelectionPattern(e,n);return this.cleanup(n),r}analyzeSelectionPattern(e,t){if(!e.rangeCount)return!1;let n=e.getRangeAt(0),r=n.toString(),i=(t-this.selectionStartTime)/1e3;if(r.length/Math.max(1,i)>this.options.maxSelectionsPerSecond)return!0;let a=n.startOffset,o=Math.abs(a-this.lastSelectionPosition);return this.selectionPatterns.push(o),this.selectionPatterns.length>this.options.historySize&&(this.selectionPatterns.shift(),this.calculateVariance(this.selectionPatterns)<this.options.minVariance)||(this.lastSelectionPosition=a,!1)}calculateVariance(e){if(e.length===0)return 0;let t=e.reduce((e,t)=>e+t,0)/e.length;return e.reduce((e,n)=>e+(n-t)**2,0)/e.length}cleanup(e){this.events=this.events.filter(t=>e-t.timestamp<=1e3)}clear(){this.events=[],this.selectionStartTime=0,this.lastSelectionTime=0,this.lastSelectionPosition=0,this.selectionPatterns=[],this.lastSelectedText=``}},ra=class{match(e,t){for(let n of t)if(this.matchesCombo(e,n))return!0;return!1}matchesCombo(e,t){return e.keyCode===t.keyCode&&this.matchesModifier(e.ctrlKey,t.ctrl)&&this.matchesModifier(e.shiftKey,t.shift)&&this.matchesModifier(e.altKey,t.alt)&&this.matchesModifier(e.metaKey,t.meta)}matchesModifier(e,t){return t===void 0?!e:e===t}createKeyHandler(e,t){return n=>{this.match(n,e)&&(n.preventDefault(),n.stopPropagation(),t(n))}}createActivityEvent(e,t,n,r){let i,a;if(r){let e=r.getSelection(),t=e?.toString()||``,n=(t&&e?.rangeCount?e.getRangeAt(0)?.getClientRects():null)?.[0];n&&t&&(i={text:t,x:n.x,y:n.y,width:n.width,height:n.height});let o=r.document.activeElement;o&&o!==r.document.body&&(a=si(o)?.outerHTML)}return{type:t,timestamp:Date.now(),key:e.key,code:e.code,keyCode:e.keyCode,ctrlKey:e.ctrlKey,altKey:e.altKey,shiftKey:e.shiftKey,metaKey:e.metaKey,targetFrameSrc:n,selectedText:i,interactiveElement:a}}createKeyboardHandlers(e,t,n,r){let i=[];return t.forEach(t=>{i.push(...t.keyCombos.map(i=>({...i,handler:i=>{let a=t.type;n(this.createActivityEvent(i,a,e,r))}})))}),i}createUnifiedHandler(e,t,n,r){let i=this.createKeyboardHandlers(e,t,n,r);return e=>{if(e.isTrusted){for(let t of i)if(this.match(e,[t])){let n=t.suppressOnInteractiveElement;if(n){let e=(r?.document??document).activeElement;if(Array.isArray(n)?n.some(t=>e?.matches(t)):li(e))return}e.preventDefault(),e.stopPropagation(),t.handler(e);return}}}}},ia=class e extends Ir{constructor(){super(...arguments),this.configApplied=!1,this.cleanupCallbacks=[],this.pointerMoved=!1,this.isContextMenuEnabled=!1,this.isDragAndDropEnabled=!1,this.isSelectionMonitoringEnabled=!1,this.isBulkCopyProtectionEnabled=!1,this.selectionAnalyzer=null,this.currentSelection=null,this.bulkCopyProtector=null,this.keyManager=new ra,this.keyDownHandler=null,this.preventBulkCopy=e=>{if(!this.isBulkCopyProtectionEnabled||!this.bulkCopyProtector)return!0;if(!this.bulkCopyProtector.shouldAllowCopy(e)){e.preventDefault();let t=this.wnd.getSelection(),n=t?.toString()||``,r=(n?t?.getRangeAt(0)?.getClientRects():null)?.[0],i={type:`bulk_copy`,timestamp:Date.now(),clipboardTypes:e.clipboardData?.types?[...e.clipboardData.types]:[],selectedText:r?{text:n,x:r.x,y:r.y,width:r.width,height:r.height}:void 0,selectionLength:n.length,targetFrameSrc:this.wnd.location.href};return this.comms?.send(`content_protection`,i),!1}return!0},this.handleSelection=e=>{if(!this.isSelectionMonitoringEnabled||!this.wnd||!this.selectionAnalyzer)return;let t=this.wnd.getSelection();if(t){if(this.currentSelection=t.toString(),this.selectionAnalyzer.analyze(t)&&this.currentSelection){let t=this.wnd.getSelection(),n=t?.toString()||``,r=(n&&t?.rangeCount?t.getRangeAt(0)?.getClientRects():null)?.[0],i={type:`suspicious_selection`,timestamp:Date.now(),selectionLength:n.length,selectedText:{text:n,x:r?.x??0,y:r?.y??0,width:r?.width??0,height:r?.height??0},eventType:e?.type||`selectionchange`,targetFrameSrc:this.wnd.location.href};this.comms?.send(`content_protection`,i)}}else this.currentSelection=null},this.onDragOver=e=>{this.isDragAndDropEnabled&&(e.preventDefault(),e.stopPropagation())},this.onDragStart=e=>{if(this.isDragAndDropEnabled){e.preventDefault();let t={type:`drag_detected`,timestamp:Date.now(),dataTransferTypes:e.dataTransfer?.types?[...e.dataTransfer.types]:[],targetFrameSrc:this.wnd.location.href};return this.comms?.send(`content_protection`,t),!1}return!0},this.onDrop=e=>{if(this.isDragAndDropEnabled){e.preventDefault();let t=e.dataTransfer,n={type:`drop_detected`,timestamp:Date.now(),dataTransferTypes:t?.types?[...t.types]:[],fileCount:t?.files?.length||0,targetFrameSrc:this.wnd.location.href};return this.comms?.send(`content_protection`,n),!1}return!0},this.onContext=e=>{if(this.isContextMenuEnabled){e.preventDefault();let t=this.wnd.getSelection(),n=t?.toString()||``,r=(n&&t?.rangeCount?t.getRangeAt(0)?.getClientRects():null)?.[0],i={timestamp:Date.now(),clientX:e.clientX,clientY:e.clientY,...r&&{selectedText:{text:n,x:r.x,y:r.y,width:r.width,height:r.height}},targetFrameSrc:this.wnd.location.href};this.comms?.send(`context_menu`,i)}},this.onPointerUp=this.onPointUp.bind(this),this.onPointerMove=this.onPointMove.bind(this),this.onPointerDown=this.onPointDown.bind(this),this.onClicker=this.onClick.bind(this)}addContextMenuPrevention(){this.isContextMenuEnabled||!this.wnd||(this.wnd.document.addEventListener(`contextmenu`,this.onContext),this.isContextMenuEnabled=!0)}removeContextMenuPrevention(){!this.isContextMenuEnabled||!this.wnd||(this.wnd.document.removeEventListener(`contextmenu`,this.onContext),this.isContextMenuEnabled=!1)}addDragAndDropPrevention(){this.isDragAndDropEnabled||!this.wnd||(this.wnd.document.addEventListener(`dragstart`,this.onDragStart),this.wnd.document.addEventListener(`dragover`,this.onDragOver),this.wnd.document.addEventListener(`drop`,this.onDrop),this.isDragAndDropEnabled=!0)}removeDragAndDropPrevention(){!this.isDragAndDropEnabled||!this.wnd||(this.wnd.document.removeEventListener(`dragstart`,this.onDragStart),this.wnd.document.removeEventListener(`dragover`,this.onDragOver),this.wnd.document.removeEventListener(`drop`,this.onDrop),this.isDragAndDropEnabled=!1)}enableKeyboardPeripherals(e=[]){this.disableKeyboardPeripherals();let t=e=>{this.comms?.send(`keyboard_peripherals`,e)};this.keyDownHandler=this.keyManager.createUnifiedHandler(this.wnd.location.href,e,t,this.wnd),this.wnd&&this.wnd.document.addEventListener(`keydown`,this.keyDownHandler,{capture:!0})}disableKeyboardPeripherals(){this.wnd&&this.keyDownHandler&&(this.wnd.document.removeEventListener(`keydown`,this.keyDownHandler,{capture:!0}),this.keyDownHandler=null)}addBulkCopyProtection(e={}){if(this.isBulkCopyProtectionEnabled||!this.wnd)return;let t=vi,n=e?{...t,...e}:t;this.bulkCopyProtector=new ta(this.wnd,n),this.wnd.document.addEventListener(`copy`,this.preventBulkCopy,!0),this.wnd.document.addEventListener(`cut`,this.preventBulkCopy,!0),this.isBulkCopyProtectionEnabled=!0}removeBulkCopyProtection(){!this.isBulkCopyProtectionEnabled||!this.wnd||(this.wnd.document.removeEventListener(`copy`,this.preventBulkCopy,!0),this.wnd.document.removeEventListener(`cut`,this.preventBulkCopy,!0),this.bulkCopyProtector?.destroy(),this.bulkCopyProtector=null,this.isBulkCopyProtectionEnabled=!1)}addSelectionMonitoring(e){if(this.isSelectionMonitoringEnabled||!this.wnd)return;let t=e||_i;this.selectionAnalyzer=new na(t),this.wnd.document.addEventListener(`selectionchange`,this.handleSelection),this.isSelectionMonitoringEnabled=!0}removeSelectionMonitoring(){!this.isSelectionMonitoringEnabled||!this.wnd||(this.wnd.document.removeEventListener(`selectionchange`,this.handleSelection),this.selectionAnalyzer?.clear(),this.selectionAnalyzer=null,this.isSelectionMonitoringEnabled=!1)}onPointUp(e){let t=this.wnd.getSelection();if(t&&t.toString()?.length>0){let e=t.getRangeAt(0)?.getClientRects();if(!e||e.length===0)return;let n=e[0],r={text:t.toString(),x:n.x,y:n.y,width:n.width,height:n.height,targetFrameSrc:this.wnd?.location?.href};this.comms.send(`text_selected`,r)}if(this.pointerMoved){this.pointerMoved=!1;return}if(!t?.isCollapsed||!e.isPrimary)return;let n=this.wnd.devicePixelRatio;e.preventDefault(),this.comms.send(e.pointerType===`touch`?`tap`:`click`,{defaultPrevented:e.defaultPrevented,x:e.clientX*n,y:e.clientY*n,targetFrameSrc:this.wnd.location.href,targetElement:e.target.outerHTML,interactiveElement:si(e.target)?.outerHTML,cssSelector:this.wnd._readium_cssSelectorGenerator.getCssSelector(e.target),onContent:this.isOnContent(e.target,e.clientX,e.clientY)}),this.pointerMoved=!1}onPointMove(e){e.movementY!==void 0&&e.movementX!==void 0?(Math.abs(e.movementX)>1||Math.abs(e.movementY)>1)&&(this.pointerMoved=!0):this.pointerMoved=!0}onPointDown(){this.pointerMoved=!1}onClick(e){if(e.preventDefault(),!e.isTrusted){let t=new PointerEvent(`pointerup`,{isPrimary:!0,pointerType:`mouse`,clientX:e.clientX,clientY:e.clientY});Object.defineProperty(t,"target",{writable:!1,value:e.target}),Object.defineProperty(t,"defaultPrevented",{writable:!1,value:e.defaultPrevented}),this.onPointUp(t)}}isOnContent(e,t,n){if(e.closest(`img, svg, video, audio, canvas, object`))return!0;let r=this.wnd.document.createRange();for(let i of Array.from(e.childNodes))if(i.nodeType===Node.TEXT_NODE&&i.textContent?.trim()&&(r.selectNodeContents(i),Array.from(r.getClientRects()).some(e=>U(e,t,n,0))))return!0;return!1}static matches(e,t){try{return e.matches(t)}catch{return!1}}static startsIn(e,t){return e.comparePoint(t.startContainer,t.startOffset)===0&&(t.startContainer!==e.endContainer||t.startOffset!==e.endOffset)}containerRange(t,n,r){let i;for(let a=t;a;a=a.parentElement){let t=Ui(a),o=n.find(n=>t.includes(n.role)&&(!n.selector||e.matches(a,n.selector)));if(!o)continue;let s=this.ruleRange(a,o);if(!(r!==void 0&&e.startsIn(s,r)?o.currentContainer??o.container:o.container))break;i=s}return i}ruleRange(e,t){let n=this.wnd.document.createRange();n.selectNode(e);let r=t.startAt;if(r){let t=e=>Ui(e).includes(r),i=e.previousElementSibling;for(;i&&!t(i);)i=i.previousElementSibling;for(;i&&t(i);)n.setStartBefore(i),i=i.previousElementSibling}return n}pieceRange([e,t]){return Fr(this.wnd.document,new M({href:this.wnd.location.href,type:`text/html`,text:st.deserialize(e),locations:t?new j({otherLocations:new Map([[`cssSelector`,t]])}):void 0}))??void 0}pointedPiece({cssSelector:t,x:n,y:r,pieces:i,rules:a,current:o}){let s=this.wnd.document.querySelector(t);if(!s)return-1;let c=this.wnd.document.createRange();c.selectNode(s);let l=a?.length?this.containerRange(s,a,o&&this.pieceRange(o)):void 0,u=this.wnd.devicePixelRatio,d=(e,t)=>e.compareBoundaryPoints(Range.START_TO_START,t)<=0&&e.compareBoundaryPoints(Range.END_TO_END,t)>=0,f=(e,t,n)=>!e||d(e.range,n)&&!d(n,e.range)?{index:t,range:n}:e,p,m;for(let t=0;t<i.length;t++){let a=this.pieceRange(i[t]);if(a){if(l&&e.startsIn(l,a))return t;a.intersectsNode(s)&&(Ki(a,!1).some(e=>U(e,n/u,r/u,0))?p=f(p,t,a):d(a,c)&&(m=f(m,t,a)))}}return(p??m)?.index??-1}registerPointedPiece(){this.comms.register(`pointed_piece`,e.moduleName,(e,t)=>{let n=e;this.comms.send(`pointed_piece`,{id:n.id,index:this.pointedPiece(n)}),t(!0)})}registerProtectionHandlers(){this.comms?.register(`peripherals_protection`,e.moduleName,(e,t)=>{let n=e;if(!this.configApplied){if(this.configApplied=!0,n.monitorSelection){let e=typeof n.monitorSelection==`boolean`?void 0:n.monitorSelection;this.addSelectionMonitoring(e),this.comms?.log(`Selection monitoring enabled`)}typeof n.protectCopy==`object`?(this.addBulkCopyProtection({enabled:!0,...n.protectCopy}),this.comms?.log(`Copy protection enabled (limited)`)):n.protectCopy===!0&&(this.addBulkCopyProtection({enabled:!0,maxSelectionPercent:0,minThreshold:0,absoluteMaxChars:0}),this.comms?.log(`Copy protection enabled`)),n.disableContextMenu&&(this.addContextMenuPrevention(),this.comms?.log(`Context menu protection enabled`)),n.disableDragAndDrop&&(this.addDragAndDropPrevention(),this.comms?.log(`Drag and drop protection enabled`))}t(!0)}),this.comms?.register(`unfocus`,e.moduleName,(e,t)=>{this.disableKeyboardPeripherals(),t(!0)}),this.comms?.register(`keyboard_peripherals`,e.moduleName,(e,t)=>{let n=e;n&&n.length>0&&(this.enableKeyboardPeripherals(n),this.comms?.log(`Keyboard peripherals enabled: ${n.map(e=>e.type).join(`, `)}`)),t(!0)})}mount(e,t){return this.wnd=e,this.comms=t,this.registerProtectionHandlers(),this.registerPointedPiece(),e.document.addEventListener(`pointerdown`,this.onPointerDown),e.document.addEventListener(`pointerup`,this.onPointerUp),e.document.addEventListener(`pointermove`,this.onPointerMove),e.document.addEventListener(`click`,this.onClicker),t.log(`Peripherals Mounted`),!0}unmount(t,n){return this.removeBulkCopyProtection(),this.removeSelectionMonitoring(),this.removeContextMenuPrevention(),this.removeDragAndDropPrevention(),this.disableKeyboardPeripherals(),this.cleanupCallbacks.forEach(e=>e()),this.cleanupCallbacks=[],t.document.removeEventListener(`pointerdown`,this.onPointerDown),t.document.removeEventListener(`pointerup`,this.onPointerUp),t.document.removeEventListener(`pointermove`,this.onPointerMove),t.document.removeEventListener(`click`,this.onClicker),n.unregisterAll(e.moduleName),this.configApplied=!1,n.log(`Peripherals Unmounted`),!0}};ia.moduleName=`peripherals`;var aa=ia,oa=class e extends Ir{constructor(){super(...arguments),this.mediaPlayingCount=0,this.allAnimations=new Set}wndOnErr(e){this.comms?.send(`error`,{message:e.message,filename:e.filename,lineno:e.lineno,colno:e.colno})}unblock(e){for(e._readium_blockEvents=!1;e._readium_blockedEvents?.length>0;){let t=e._readium_blockedEvents.shift();switch(t[0]){case 0:Reflect.apply(t[1],t[2],t[3]);break;case 1:let n=t[1],r=t[2];e.removeEventListener(n.type,e._readium_eventBlocker,!0);let i=new Event(n.type,{bubbles:n.bubbles,cancelable:n.cancelable});r?r.dispatchEvent(i):e.dispatchEvent(i)}}}onMediaPlayEvent(){this.mediaPlayingCount++,this.comms?.send(`media_play`,this.mediaPlayingCount)}onMediaPauseEvent(){this.mediaPlayingCount>0&&this.mediaPlayingCount--,this.comms?.send(`media_pause`,this.mediaPlayingCount)}pauseAllMedia(e){let t=e.document.querySelectorAll(`audio,video`);for(let e=0;e<t.length;e++)t[e].pause()}mount(t,n){this.comms=n,t.addEventListener(`error`,this.wndOnErr,!1),Reflect.defineProperty(t.navigator,"epubReadingSystem",{value:{name:`readium-ts-toolkit`,version:`2.11.0`,hasFeature:(e,t=``)=>{switch(e){case`dom-manipulation`:return!0;case`layout-changes`:return!0;case`touch-events`:return!0;case`mouse-events`:return!0;case`keyboard-events`:return!0;case`spine-scripting`:return!0;case`embedded-web-content`:return!0;default:return!1}}},writable:!1}),`getAnimations`in t.document&&t.document.getAnimations().forEach(e=>{e.cancel(),this.allAnimations.add(e)}),n.register(`activate`,e.moduleName,(e,t)=>{this.allAnimations.forEach(e=>{e.cancel(),e.play()}),t(!0)}),n.register(`unfocus`,e.moduleName,(e,n)=>{this.pauseAllMedia(t),this.allAnimations.forEach(e=>e.pause()),n(!0)});let r=t.document.querySelectorAll(`audio,video`);for(let e=0;e<r.length;e++){let t=r[e];t.addEventListener(`play`,this.onMediaPlayEvent,{passive:!0}),t.addEventListener(`pause`,this.onMediaPauseEvent,{passive:!0})}return n.log(`Setup Mounted`),!0}unmount(e,t){return e.removeEventListener(`error`,this.wndOnErr),e.removeEventListener(`play`,this.onMediaPlayEvent),e.removeEventListener(`pause`,this.onMediaPauseEvent),this.allAnimations.forEach(e=>e.cancel()),this.allAnimations.clear(),t.log(`Setup Unmounted`),!0}};oa.moduleName=`setup`;var sa=oa,ca=`readium-viewport`,la=class e extends sa{onViewportWidthChanged(e){let t=e.target;ni(t,`--RS__viewportWidth`,`${t.innerWidth}px`)}mount(t,n){if(!super.mount(t,n))return!1;let r=t.document.createElement(`meta`);return r.dataset.readium=`true`,r.setAttribute(`name`,`viewport`),r.setAttribute(`id`,ca),r.setAttribute(`content`,`width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no`),t.document.head.appendChild(r),t.addEventListener(`orientationchange`,this.onViewportWidthChanged),t.addEventListener(`resize`,this.onViewportWidthChanged),this.onViewportWidthChanged({target:t}),n.register(`get_properties`,e.moduleName,(e,n)=>{$r(t),n(!0)}),n.register(`update_properties`,e.moduleName,(e,n)=>{e[`--RS__viewportWidth`]=`${t.innerWidth}px`,ei(t,e),n(!0)}),n.register(`set_property`,e.moduleName,(e,n)=>{let r=e;ni(t,r[0],r[1]),n(!0)}),n.register(`remove_property`,e.moduleName,(e,n)=>{ri(t,e),n(!0)}),n.register(`activate`,e.moduleName,(e,n)=>{this.unblock(t),n(!0)}),n.log(`ReflowableSetup Mounted`),!0}unmount(t,n){return n.unregisterAll(e.moduleName),t.document.head.querySelector(`#${ca}`)?.remove(),t.removeEventListener(`orientationchange`,this.onViewportWidthChanged),n.log(`ReflowableSetup Unmounted`),super.unmount(t,n)}};la.moduleName=`reflowable_setup`;var ua=la,da=`readium-fixed-style`,fa=class e extends sa{mount(t,n){if(!super.mount(t,n))return!1;t.navigator.epubReadingSystem&&(t.navigator.epubReadingSystem.layoutStyle=`paginated`);let r=t.document.createElement(`style`);return r.id=da,r.dataset.readium=`true`,r.textContent=`
        html, body {
            text-size-adjust: none;
            -ms-text-size-adjust: none;
            -webkit-text-size-adjust: none;
            -moz-text-size-adjust: none;

            /* Fight Safari pinches */
            touch-action: none !important;
            min-height: 100%;

            /*cursor: var() TODO*/
        }`,t.document.head.appendChild(r),n.register(`set_property`,e.moduleName,(e,n)=>{let r=e;ni(t,r[0],r[1]),n(!0)}),n.register(`remove_property`,e.moduleName,(e,n)=>{ri(t,e),n(!0)}),n.register(`first_visible_locator`,e.moduleName,(e,t)=>t(!1)),n.register(`unfocus`,e.moduleName,(e,n)=>{H(t),n(!0)}),n.register([`focus`,`go_next`,`go_prev`,`go_id`,`go_end`,`go_start`,`go_text`,`go_progression`],e.moduleName,(e,t)=>t(!0)),n.register(`activate`,e.moduleName,(e,n)=>{this.unblock(t),n(!0)}),n.log(`FixedSetup Mounted`),!0}unmount(t,n){return n.unregisterAll(e.moduleName),t.document.getElementById(da)?.remove(),n.log(`FixedSetup Unmounted`),super.unmount(t,n)}};fa.moduleName=`fixed_setup`;var pa=fa,ma=`div.span.p.br.hr.b.i.em.strong.s.u.mark.small.sub.sup.abbr.cite.code.data.dfn.kbd.q.samp.time.var.blockquote.pre.svg.g.path.circle.ellipse.rect.line.polygon.polyline.text.tspan.defs.use`.split(`.`),ha=/^on/i,ga=new Set([`href`,`src`,`action`,`formaction`,`xlink:href`]),_a=/^\s*(javascript|data):/i;function va(e,t){let n=e.document.createElement(`div`);if(`Sanitizer`in e&&typeof n.setHTML==`function`)try{let r=new e.Sanitizer({allowElements:ma});return n.setHTML(t,{sanitizer:r}),n.firstElementChild}catch{}let r=e.document.implementation.createHTMLDocument(``);for(r.body.innerHTML=t,ya(r.body,new Set(ma));r.body.firstChild;)n.appendChild(e.document.adoptNode(r.body.firstChild));return n.firstElementChild}function ya(e,t){let n=Array.from(e.querySelectorAll(`*`)).reverse();for(let e of n)if(!t.has(e.localName))e.replaceWith(...Array.from(e.childNodes));else for(let{name:t,value:n}of Array.from(e.attributes))(ha.test(t)||ga.has(t)&&_a.test(n))&&e.removeAttribute(t)}function ba(e){switch(e){case G.Mask:return`rgba(255, 255, 255, 0.5)`;case G.Highlight:case G.HighlightUnderline:return`#FFFF00`;default:return`#FF0000`}}var G={Highlight:`highlight`,HighlightUnderline:`highlightUnderline`,Underline:`underline`,Strikethrough:`strikethrough`,Outline:`outline`,TextColor:`textColor`,Mask:`mask`,Template:`template`},xa=(e=>(e.Wrap=`wrap`,e.Viewport=`viewport`,e.Bounds=`bounds`,e.Page=`page`,e))(xa||{}),Sa=(e=>(e.Boxes=`boxes`,e.Bounds=`bounds`,e))(Sa||{}),Ca=(e=>(e.Solid=`solid`,e.Dashed=`dashed`,e.Dotted=`dotted`,e.Wavy=`wavy`,e))(Ca||{}),wa=()=>`Highlight`in window,Ta=[`IMG`,`IMAGE`,`AUDIO`,`VIDEO`,`SVG`],Ea=[...Ta,`IFRAME`,`OBJECT`,`EMBED`,`CANVAS`],Da=new Set([`SUP`,`SUB`,`SMALL`,`CODE`]),Oa=2,ka=1,Aa=.1,ja=class e{constructor(e,t,n,r){this.wnd=e,this.comms=t,this.id=n,this.name=r,this.items=[],this.lastItemId=0,this.container=void 0,this._activatable=!1,this._hoverable=!1,this.hoveredItem=void 0,this.hoveredFragment=0,this.experimentalHighlights=!1,this._tintSubKeys=new Map,this._subKeyCounter=0,this.pendingWebkitReflow=null,this.maskSvg=void 0,this.shadowHost=void 0,this.shadowRoot=void 0,this.currentRender=0,this.pendingRender=new Set,this.maskFrame=0,wa()&&(this.experimentalHighlights=!0,this.notTextFlag=new Map),this.activationHandler=this.handleActivation.bind(this),this.wnd.document.addEventListener(`pointerup`,this.activationHandler),this.hoverHandler=this.handleHover.bind(this),this.wnd.document.addEventListener(`pointermove`,this.hoverHandler)}get activatable(){return this._activatable}set activatable(e){this._activatable=e}get hoverable(){return this._hoverable}get hasOverlayItems(){return!this.experimentalHighlights||(this.notTextFlag?.size??0)>0}set hoverable(e){if(this._hoverable=e,!e&&this.hoveredItem){let e=this.hoveredBounds(this.hoveredItem),t=this.wnd.devicePixelRatio;this.comms.send(`decoration_pointer_leave`,{decorationId:this.hoveredItem.decoration.id,group:this.name,rect:{top:e.top*t,left:e.left*t,width:e.width*t,height:e.height*t}}),this.hoveredItem=void 0}}add(t){let n=`${this.id}-${this.lastItemId++}`,r=Fr(this.wnd.document,t.locator);if(!r){this.comms.log(`Can't locate DOM range for decoration`,t);return}let i=r.commonAncestorContainer;if(i.nodeType!==Node.TEXT_NODE&&this.experimentalHighlights&&(Ta.includes(i.nodeName.toUpperCase())&&this.notTextFlag?.set(n,!0),r.cloneContents().querySelector(Ta.join(`, `).toLowerCase())&&this.notTextFlag?.set(n,!0),(i.textContent?.trim()||``).length===0&&this.notTextFlag?.set(n,!0)),this.experimentalHighlights&&!this.notTextFlag?.has(n)){let e=e=>{for(;e&&e.nodeType===Node.ELEMENT_NODE;){if(e.namespaceURI?.includes(`svg`))return!0;e=e.parentNode}return!1};(e(r.startContainer)||e(r.endContainer))&&this.notTextFlag?.set(n,!0)}if(this.experimentalHighlights){let{type:e}=t.style,{layout:r,width:i,expand:a,thickness:o,lineStyle:s}=t.style;e!==G.TextColor&&(e===G.Outline||e===G.Template||e===G.Mask||r!==void 0&&r!==`boxes`||i!==void 0&&i!==`wrap`||a||E.UA.WebKit&&e!==G.Highlight&&(o!==void 0||s&&s!==`solid`)||E.UA.Blink&&Ur(this.wnd)&&(e===G.Underline||e===G.HighlightUnderline))&&this.notTextFlag?.set(n,!0)}let a={decoration:t,id:n,range:r,hitRects:[],clickableElements:void 0,container:void 0};this.items.push(a),this.layout(a),a.hitRects=this.clientRectsToDocCoords(Ki(e.rangeBoxes(a.range),!1,!1,this.scaledExpand(a.decoration.style)+this.hitGap())),this.renderLayout([a])}remove(e){let t=this.items.findIndex(t=>t.decoration.id===e);if(t<0)return;let n=this.items[t],r=n.decoration.style?.type===G.Mask;if(this.items.splice(t,1),n.clickableElements=void 0,n.container&&(n.container.remove(),n.container=void 0),this.experimentalHighlights&&!this.notTextFlag?.has(n.id)&&n.highlightSubKey){let e=this.wnd.CSS.highlights;e.get(n.highlightSubKey)?.delete(n.range),this.items.some(e=>e.highlightSubKey===n.highlightSubKey)||e.delete(n.highlightSubKey);let t=this.wnd.document.getElementById(`${this.id}-style`);t&&this._rebuildHighlightStylesheet(t),this.scheduleWebkitRepaintFix([n])}this.notTextFlag?.delete(n.id),this.hoveredItem===n&&(this.hoveredItem=void 0),r&&this.scheduleMaskUpdate()}update(e){this.remove(e.id),this.add(e)}clear(){this.experimentalHighlights&&this.scheduleWebkitRepaintFix(this.items),this.clearContainer(),this.items.length=0,this.notTextFlag?.clear(),this.hoveredItem=void 0,this.maskSvg?this.scheduleMaskUpdate():this.removeShadowHost()}destroy(){this.clear(),this.wnd.cancelAnimationFrame(this.maskFrame),this.maskFrame=0,this.maskSvg?.remove(),this.maskSvg=void 0,this.removeShadowHost(),this.wnd.document.removeEventListener(`pointerup`,this.activationHandler),this.wnd.document.removeEventListener(`pointermove`,this.hoverHandler)}isWebkitRepaintProne(e){let t=this.wnd.getComputedStyle(e);if(Da.has(e.tagName.toUpperCase())||t.display===`inline-block`||t.verticalAlign!==`baseline`)return!0;let n=e.parentElement?this.wnd.getComputedStyle(e.parentElement):null;return!!n&&parseFloat(t.fontSize)!==parseFloat(n.fontSize)}findWebkitRepaintProneElement(e){let t=e.startContainer.nodeType===Node.ELEMENT_NODE?e.startContainer:e.startContainer.parentElement;for(;t;){if(this.isWebkitRepaintProne(t))return t;if(this.wnd.getComputedStyle(t).display!==`inline`)break;t=t.parentElement}let n=e.commonAncestorContainer,r=n.nodeType===Node.ELEMENT_NODE?n:n.parentElement;if(!r)return null;let i=this.wnd.document.createTreeWalker(r,NodeFilter.SHOW_ELEMENT,t=>e.intersectsNode(t)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT);for(let e=i.nextNode();e;e=i.nextNode())if(this.isWebkitRepaintProne(e))return e;return null}forceWebkitBlockReflow(e){let t=e;for(;t;){let e=this.wnd.getComputedStyle(t).display;if(e!==`inline`&&e!==`inline-block`)break;t=t.parentElement}if(!t||!t.isConnected)return;let n=t,r=n.style.getPropertyValue(`transform`),i=n.style.getPropertyPriority(`transform`);n.style.setProperty(`transform`,`translateZ(0.001px)`,`important`),n.offsetHeight,n.style.setProperty(`transform`,`translateZ(0px)`,`important`),n.offsetHeight,r?n.style.setProperty(`transform`,r,i):n.style.removeProperty(`transform`)}scheduleWebkitRepaintFix(e){if(E.UA.WebKit)for(let t of e){if(this.notTextFlag?.has(t.id)||!t.highlightSubKey)continue;let e=this.findWebkitRepaintProneElement(t.range);e&&this.queueWebkitReflow(e)}}queueWebkitReflow(e){this.pendingWebkitReflow||(this.pendingWebkitReflow=new Set,this.wnd.requestAnimationFrame(()=>{let e=this.pendingWebkitReflow;this.pendingWebkitReflow=null,e?.forEach(e=>this.forceWebkitBlockReflow(e))})),this.pendingWebkitReflow.add(e)}clientRectsToDocCoords(e,t=V(this.wnd)){let n=t.xDocOffset,r=t.yDocOffset;return n===0&&r===0?e:e.map(e=>({left:e.left+n,top:e.top+r,right:e.right+n,bottom:e.bottom+r,width:e.width,height:e.height}))}pointerToDocCoords(e){let t=V(this.wnd);return{docX:e.clientX+t.xDocOffset,docY:e.clientY+t.yDocOffset}}effectiveZoom(){if(!E.UA.Blink)return 1;let e=parseFloat(this.wnd.getComputedStyle(this.wnd.document.documentElement).zoom),t=parseFloat(this.wnd.getComputedStyle(this.wnd.document.body).zoom);return(e||1)*(t||1)}hitGap(){return 2*this.effectiveZoom()}scaledExpand(e){return(e.expand??0)*this.effectiveZoom()}handleActivation(t){if(!this._activatable)return;let{docX:n,docY:r}=this.pointerToDocCoords(t),i=this.wnd.devicePixelRatio;for(let a of this.items){let o;if(a.decoration.style.type===G.Template)for(let e of a.clickableElements??[]){let n=e.getBoundingClientRect();if(U(n,t.clientX,t.clientY,0)){o=n;break}}else for(let i of a.hitRects)if(U(i,n,r,0)){let n=e.fragmentBounds(a.range);o=n[e.fragmentIndex(n,e.pointRect(t),V(this.wnd))];break}if(o){this.comms.send(`decoration_activated`,{decorationId:a.decoration.id,group:this.name,rect:{top:o.top*i,left:o.left*i,width:o.width*i,height:o.height*i},point:{x:t.clientX*i,y:t.clientY*i}});return}}}handleHover(t){if(!this._hoverable)return;let{docX:n,docY:r}=this.pointerToDocCoords(t),i=this.wnd.devicePixelRatio,a,o,s=0;for(let e of this.items){if(e.decoration.style.type===G.Template)for(let n of e.clickableElements??[]){let r=n.getBoundingClientRect();if(U(r,t.clientX,t.clientY,0)){a=e,o=r;break}}else for(let t of e.hitRects)if(U(t,n,r,0)){a=e;break}if(a)break}if(a!==this.hoveredItem){if(a){let n=e.fragmentBounds(a.range);s=e.fragmentIndex(n,e.pointRect(t),V(this.wnd)),o??(o=n[s])}if(this.hoveredItem){let e=this.hoveredItem.range.commonAncestorContainer.isConnected?this.hoveredBounds(this.hoveredItem):null;this.comms.send(`decoration_pointer_leave`,{decorationId:this.hoveredItem.decoration.id,group:this.name,rect:e?{top:e.top*i,left:e.left*i,width:e.width*i,height:e.height*i}:void 0,point:{x:t.clientX*i,y:t.clientY*i}})}this.hoveredItem=a,this.hoveredFragment=s,a&&o&&this.comms.send(`decoration_pointer_enter`,{decorationId:a.decoration.id,group:this.name,rect:{top:o.top*i,left:o.left*i,width:o.width*i,height:o.height*i},point:{x:t.clientX*i,y:t.clientY*i}})}}requestLayout(){this.wnd.cancelAnimationFrame(this.currentRender),this.clearContainer(),this.wnd.document.fonts.ready.then(()=>{this.currentRender=this.wnd.requestAnimationFrame(()=>{this.items.forEach(t=>{this.layout(t),t.hitRects=this.clientRectsToDocCoords(Ki(e.rangeBoxes(t.range),!1,!1,this.scaledExpand(t.decoration.style)+this.hitGap()))}),this.renderLayout(this.items)})})}repositionOverlays(){let t=[],n=V(this.wnd),r;this.items.forEach(i=>{if(!this.experimentalHighlights||this.notTextFlag?.has(i.id)){if(i.decoration.style?.type===G.Mask){this.scheduleMaskUpdate();return}this.repositionItem(i,r??(r=this.overlayContext()))||(i.container?.remove(),this.layout(i),t.push(i)),i.hitRects=this.clientRectsToDocCoords(Ki(e.rangeBoxes(i.range),!1,!1,this.scaledExpand(i.decoration.style)+this.hitGap()),n)}}),t.length&&this.renderLayout(t)}experimentalLayout(t){let n=this.requireContainer(!0),r=this.wnd.CSS.highlights,i=t.decoration.style,a=i.type??G.Highlight,o=i.tint??ba(a),s=i.width,c=i.layout,l=this._getSubKey(a,o,i.thickness,i.lineStyle);t.highlightSubKey&&(r.get(t.highlightSubKey)?.delete(t.range),t.highlightSubKey!==l&&!this.items.some(e=>e!==t&&e.highlightSubKey===t.highlightSubKey)&&r.delete(t.highlightSubKey)),t.highlightSubKey=l;let u;r.has(l)?u=r.get(l):(u=new this.wnd.Highlight,r.set(l,u));let d=(e,t)=>this.wnd.document.caretPositionFromPoint?.(e,t)??null;if(a===G.TextColor&&(c===`bounds`||s===`bounds`||s===`page`)){let n=V(this.wnd);if(n.isVertical)console.warn(`Vertical writing detected: caretPositionFromPoint has known bugs, falling back to original range`),u.add(t.range);else{let r=e.fragmentBounds(t.range),i=r[0],a=r[r.length-1],o=t.range.commonAncestorContainer,c=o.nodeType===Node.ELEMENT_NODE?o:o.parentElement,l=Vr(this.wnd,c),f=e=>{let t=s===`page`?Math.floor(n.inlineStart(e)/n.pageInlineSize)*n.pageInlineSize:n.inlineStart(e),r=s===`page`?n.pageInlineSize:n.inlineSize(e);return l?[t+r,t]:[t,t+r]},p=d(f(i)[0],n.blockStart(i)+1),m=d(f(a)[1],n.blockStart(a)+n.blockSize(a)-1),h=this.wnd.document.createRange();p&&m&&(h.setStart(p.offsetNode,p.offset),h.comparePoint(m.offsetNode,m.offset)<0?h.setStart(m.offsetNode,m.offset):h.setEnd(m.offsetNode,m.offset)),h.collapsed?u.add(t.range):(u.add(h),t.range=h)}}else u.add(t.range);let f=this.getBackgroundColor(),p=i.enforceContrast===!1?o:we(o,f),m=i.thickness===void 0?`${Aa}em`:`${i.thickness}px`,h=i.lineStyle??`solid`,g;switch(a){case G.Underline:g=`::highlight(${l}) {
                    text-decoration: underline;
                    text-decoration-color: ${p};
                    text-decoration-thickness: ${m};
                    text-decoration-style: ${h};
                }`;break;case G.Strikethrough:g=`::highlight(${l}) {
                    text-decoration: line-through;
                    text-decoration-color: ${p};
                    text-decoration-thickness: ${m};
                    text-decoration-style: ${h};
                }`;break;case G.Outline:g=`::highlight(${l}) {
                    outline: 2px solid ${p};
                    outline-offset: 1px;
                }`;break;case G.TextColor:{let e=i.thickness?i.thickness/2:0,[t,n]=V(this.wnd).isVertical?[0,e]:[e,0];g=`::highlight(${l}) {
                    color: ${p};${e?`
                    text-shadow: ${t}px ${n}px 0 ${p}, ${-t}px ${-n}px 0 ${p};`:``}
                }`;break}case G.HighlightUnderline:{let{r:e,g:t,b:n}=T(p),r=`rgba(${e}, ${t}, ${n}, 0.3)`;g=`::highlight(${l}) {
                    color: ${be(r,f)};
                    background-color: ${r};
                    text-decoration: underline;
                    text-decoration-color: ${p};
                    text-decoration-thickness: ${m};
                    text-decoration-style: ${h};
                }`;break}case G.Highlight:default:g=`::highlight(${l}) {
                    color: ${be(p,f)};
                    background-color: ${p};
                }`}t.highlightCSS=g,this._rebuildHighlightStylesheet(n)}_getSubKey(e,t,n,r){let i=`${e}::${t}::${n??``}::${r??``}`,a=this._tintSubKeys.get(i);return a||(a=`${this.id}--${this._subKeyCounter++}`,this._tintSubKeys.set(i,a)),a}_rebuildHighlightStylesheet(e){let t=new Set,n=[];for(let e of this.items)e.highlightSubKey&&e.highlightCSS&&!t.has(e.highlightSubKey)&&(t.add(e.highlightSubKey),n.push(e.highlightCSS));e.innerHTML=n.join(`
`)}positionElement(e,t,n,r,i,a,o=0){let[s,c,l,u]=this.overlayBox(e,t,i,a,o);t.applyPosition(r,s,c,l,u,n)}overlayBox(t,n,r,i,a=0){let o=t.decoration?.style?.width,s=r;switch(o){case`viewport`:return[Math.floor(n.inlineStart(s)/n.viewportInlineSize)*n.viewportInlineSize+n.inlineScrollOffset+a,n.blockStart(s)+n.blockScrollOffset,n.viewportInlineSize-2*a,n.blockSize(s)];case`page`:return[Math.floor(n.inlineStart(s)/n.pageInlineSize)*n.pageInlineSize+n.inlineScrollOffset+a,n.blockStart(s)+n.blockScrollOffset,n.pageInlineSize-2*a,n.blockSize(s)];case`bounds`:{let t=i[e.fragmentIndex(i,s,n)];return[n.inlineStart(t)+n.inlineScrollOffset,n.blockStart(s)+n.blockScrollOffset,n.inlineSize(t),n.blockSize(s)]}default:return[n.inlineStart(s)+n.inlineScrollOffset,n.blockStart(s)+n.blockScrollOffset,n.inlineSize(s),n.blockSize(s)]}}static fragmentBounds(t){let n=e.fragmentParts(t),r=e.rangeBoxes(t);if(!n.length||n.length<2&&!Array.isArray(r))return[t.getBoundingClientRect()];for(let t of Array.isArray(r)?r:Array.from(r.getClientRects())){if(!t.width&&!t.height)continue;let r=n.find(n=>U(t,...e.center(n.column??n.text),0))??n.find(n=>U(n.text,...e.center(t),0))??n.find(n=>U(n.column??n.text,...e.center(t),0));r?r.text=Ji(r.text,t):n.push({text:t,run:0,vertical:!1})}return n.map(e=>e.text)}static fragmentParts(t){let n=t.startContainer.ownerDocument?.defaultView;if(!n)return[];let r=new Map,i=e=>r.get(e)??r.set(e,n.getComputedStyle(e)).get(e),a=new Map,o=e=>{let t=a.get(e);if(!t){let n=e.ownerDocument.createRange();n.selectNode(e);let r=e.nodeType===Node.ELEMENT_NODE?e:n;a.set(e,t=Array.from(r.getClientRects()))}return t},s=e.center,c=[],l=(e,t)=>e.vertical?e.column.top<t.bottom&&t.top<e.column.bottom:e.column.left<t.right&&t.left<e.column.right,u=0,d,f=e.rangeElements(t).textless.map(t=>({node:t,rects:e.plainRects(t.getClientRects())})),p=[...Gi(t,[`rt`,`rp`]),...f].sort((e,t)=>e.node.compareDocumentPosition(t.node)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);for(let{node:e,rects:t}of p){let n=e,r=null,a=e.nodeType===Node.ELEMENT_NODE&&i(e).columnSpan===`all`?e:null;for(let t=e.parentElement;t;n=t,t=t.parentElement){let e=i(t);if(e.columnCount!==`auto`||e.columnWidth!==`auto`){r=t;break}e.columnSpan===`all`&&(a=t)}r||(a=null),d&&d[0]===r&&d[1]===a||u++,d=[r,a];let f=!!r&&!i(r).writingMode.startsWith(`horizontal`);for(let e of t){if(!e.width&&!e.height)continue;let t=r&&!a?o(n).find(t=>U(t,...s(e),0))??e:void 0,i=c.find(e=>e.run===u&&(t&&e.column?l(e,t):!t&&!e.column));i?(i.text=Ji(i.text,e),t&&(i.column=Ji(i.column,t))):c.push({text:e,column:t,run:u,vertical:f})}}for(let e=!0;e;){e=!1;for(let t=0;t<c.length&&!e;t++){let n=c.findIndex((e,n)=>n>t&&e.run===c[t].run&&!!e.column&&!!c[t].column&&l(c[t],e.column));n<0||(c[t].text=Ji(c[t].text,c[n].text),c[t].column=Ji(c[t].column,c[n].column),c.splice(n,1),e=!0)}}return c}static rangeBoxes(t){let{textless:n,columns:r}=e.rangeElements(t);if(!r.length)return t;let i=r.flatMap(t=>e.plainRects(t.getClientRects())),a=(e,t)=>Math.abs(e.left-t.left)<.5&&Math.abs(e.top-t.top)<.5&&Math.abs(e.right-t.right)<.5&&Math.abs(e.bottom-t.bottom)<.5;return[...e.plainRects(t.getClientRects()).filter(e=>!i.some(t=>a(t,e))),...n.flatMap(t=>e.plainRects(t.getClientRects()))]}static center(e){return[(e.left+e.right)/2,(e.top+e.bottom)/2]}static fragmentIndex(e,t,n){let r=(t.left+t.right)/2,i=(t.top+t.bottom)/2,a=e.findIndex(e=>U(e,r,i,0));if(a>=0)return a;let o=(e,t,n)=>Math.max(0,e-n,n-e-t),s=e=>[o(n.inlineStart(e),n.inlineSize(e),n.isVertical?i:r),o(n.blockStart(e),n.blockSize(e),n.isVertical?r:i)],c=0;return e.forEach((t,n)=>{let[r,i]=s(t),[a,o]=s(e[c]);(r<a||r===a&&i<o)&&(c=n)}),c}static pointRect(e){return{left:e.clientX,right:e.clientX,top:e.clientY,bottom:e.clientY,width:0,height:0}}static drawnBounds(t){let n=t.decoration?.style;return n?.layout===`bounds`||n?.width===`bounds`?e.fragmentBounds(t.range):[]}hoveredBounds(t){let n=e.fragmentBounds(t.range);return n[Math.min(this.hoveredFragment,n.length-1)]}static replacedContentRects(t){let n=t.commonAncestorContainer;return n.nodeType===Node.ELEMENT_NODE?Array.from(n.querySelectorAll(Ea.join(`, `).toLowerCase())).filter(e=>t.intersectsNode(e)).flatMap(t=>e.plainRects(t.getClientRects())):[]}static rangeElements(e){let t=e.commonAncestorContainer,n=t.ownerDocument,r=n?.defaultView;if(t.nodeType!==Node.ELEMENT_NODE||!r)return{textless:[],columns:[]};let i=n.createTreeWalker(t,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:t=>e.intersectsNode(t)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}),a=[],o=new Set,s=new Set,c=(e,n)=>{for(let r=e;r&&r!==t&&!n.has(r);r=r.parentNode)n.add(r)};for(let e=i.nextNode();e;e=i.nextNode()){if(e.nodeType!==Node.ELEMENT_NODE){e.textContent.trim()&&c(e.parentNode,o);continue}a.push(e);let t=r.getComputedStyle(e);(t.columnCount!==`auto`||t.columnWidth!==`auto`)&&c(e,s)}let l,u=a.filter(e=>!o.has(e)&&!s.has(e)&&!l?.contains(e)&&(l=e)),d=n.createRange();return{textless:u,columns:a.filter(t=>s.has(t)?(d.selectNode(t),e.compareBoundaryPoints(Range.START_TO_START,d)<=0&&e.compareBoundaryPoints(Range.END_TO_END,d)>=0):!1)}}static plainRects(e){return Array.from(e,({left:e,right:t,top:n,bottom:r,width:i,height:a})=>({left:e,right:t,top:n,bottom:r,width:i,height:a}))}static mergeLineRects(e,t,n){let r=e=>t.blockStart(e)+t.blockSize(e),i=e=>t.inlineStart(e)+t.inlineSize(e),a=(e,n)=>Math.min(r(e),r(n))-Math.max(t.blockStart(e),t.blockStart(n))>Math.min(t.blockSize(e),t.blockSize(n))/2&&Math.max(t.inlineStart(e),t.inlineStart(n))-Math.min(i(e),i(n))<=1,o=(e,n,r)=>{let i=Math.min(e.left,n.left),a=Math.max(e.right,n.right),o=Math.min(e.top,n.top),s=Math.max(e.bottom,n.bottom),c={left:i,right:a,top:o,bottom:s,width:a-i,height:s-o};return r?t.isVertical?{...c,left:r.left,right:r.right,width:r.width}:{...c,top:r.top,bottom:r.bottom,height:r.height}:c},s=[];for(let r of[...e].sort((e,n)=>t.inlineStart(e)-t.inlineStart(n))){let e=s.findIndex(e=>a(r,e));if(e<0){s.push(r);continue}let i=s[e];s[e]=o(i,r,n&&(t.blockSize(r)>t.blockSize(i)?r:i))}for(let e of n??[]){let t=s.findIndex(t=>a(e,t));t<0?s.push(e):s[t]=o(s[t],e,s[t])}return s}static isShapeOutline(t){let{lineStyle:n}=t;return t.type===G.Outline&&(t.layout!==`bounds`||n===`wavy`||e.drawsOwnDots(n))}static drawsOwnDots(e){return!!E.UA.WebKit&&e===`dotted`}static dotImage(e,t){let n=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${t?`0 0 1 2`:`0 0 2 1`}" preserveAspectRatio="none"><circle cx="0.5" cy="0.5" r="0.5" fill="${e}"/></svg>`;return`url('data:image/svg+xml,${encodeURIComponent(n)}')`}static waveImage(e,t){let[n,r]=t?[`0 0 3 6`,`M1.5 0Q-0.5 1.5 1.5 3T1.5 6`]:[`0 0 6 3`,`M0 1.5Q1.5 -0.5 3 1.5T6 1.5`],i=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n}" preserveAspectRatio="none"><path d="${r}" fill="none" stroke="${e}" stroke-width="1" stroke-linecap="round"/></svg>`;return`url('data:image/svg+xml,${encodeURIComponent(i)}')`}underlineDeclarations(t,n,r,i,a,o){let s=this.underlineWidth(t),[c,l]=n.isVertical?[`right`,`left`]:[`bottom`,`top`],u=a?[c,l]:[c],d=[`box-sizing: content-box !important`],f=i===`wavy`;if(!f&&!e.drawsOwnDots(i))return d.push(...u.map(e=>`border-${e}: ${s} ${i} ${r} !important`)),a&&d.push(`margin-${l}: calc(-1 * ${s}) !important`),d.push(o?`background: ${o} padding-box !important`:`background-color: transparent !important`),d;let p=f?`calc(3 * ${s})`:s,m=`calc(${f?6:2} * ${s})`;d.push(...u.map(e=>`padding-${e}: ${p} !important`)),a&&d.push(`margin-${l}: calc(-1 * ${p}) !important`);let h=f?e.waveImage(r,n.isVertical):e.dotImage(r,n.isVertical),g=u.map(e=>({position:n.isVertical?`${e} top`:`left ${e}`,size:n.isVertical?`${p} ${m}`:`${m} ${p}`,repeat:n.isVertical?`no-repeat round`:`round no-repeat`})),_=o?[...g.map(e=>({...e,image:h,clip:`border-box`})),{image:`linear-gradient(${o}, ${o})`,position:`0 0`,size:`auto`,repeat:`no-repeat`,clip:`content-box`}]:g.map(e=>({...e,image:h,clip:`border-box`}));return d.push(`background-image: ${_.map(e=>e.image).join(`, `)} !important`,`background-position: ${_.map(e=>e.position).join(`, `)} !important`,`background-size: ${_.map(e=>e.size).join(`, `)} !important`,`background-repeat: ${_.map(e=>e.repeat).join(`, `)} !important`,`background-clip: ${_.map(e=>e.clip).join(`, `)} !important`,`background-color: transparent !important`),d}underlineWidth(e){let{thickness:t}=e.decoration.style;return t===void 0?`${Aa}em`:`${t}px`}sizeStrikethroughPattern(t,n,r,i,a){let{type:o,layout:s,lineStyle:c}=t.decoration.style;if(o!==G.Strikethrough||s===`bounds`||!c||c===`solid`)return;let l=n.blockSize(a)*r;c===`wavy`||e.drawsOwnDots(c)?i.style.setProperty(`background-size`,n.isVertical?`${l}px ${l*2}px`:`${l*2}px ${l}px`,`important`):i.style.setProperty(n.isVertical?`border-left-width`:`border-top-width`,`${l}px`,`important`)}outlineMetrics(e){let t=e.decoration.style;if(t.type!==G.Outline)return{stroke:0,wave:0,inset:0};let n=t.thickness??Oa,r=t.lineStyle===`wavy`?n:0;return{stroke:n,wave:r,inset:t.width===`page`||t.width===`viewport`?(n+ka+r*2)*this.effectiveZoom():0}}outlinePath(t,n,r,i,a,o,s,c){let l=n.isVertical&&!n.isVertLR?-1:1,u=i.map(e=>{let[i,s,c,u]=this.overlayBox(t,n,e,a,o).map(e=>e*r),d=i+c,f=s+u;return l===1?{i0:i,i1:d,b0:s,b1:f}:{i0:i,i1:d,b0:-f,b1:-s}}).sort((e,t)=>e.b0-t.b0),d=[];for(let e of u){let t=d.find(t=>{let n=t[t.length-1];return e.b0>n.b0&&e.b0-n.b1<Math.min(n.b1-n.b0,e.b1-e.b0)&&e.i0<n.i1&&e.i1>n.i0});t?t.push(e):d.push([e])}let f=(e,t)=>n.isVertical?`${t*l} ${e}`:`${e} ${t}`;return d.map(t=>{let n=t.length-1,r=e=>(t[e].b1+t[e+1].b0)/2,i=(e,t)=>r(e)+Math.sign(t)*s,a=[[t[0].i1+s,t[0].b0-s]];for(let e=0;e<n;e++){let n=i(e,t[e].i1-t[e+1].i1);a.push([t[e].i1+s,n],[t[e+1].i1+s,n])}a.push([t[n].i1+s,t[n].b1+s],[t[n].i0-s,t[n].b1+s]);for(let e=n-1;e>=0;e--){let n=i(e,t[e+1].i0-t[e].i0);a.push([t[e+1].i0-s,n],[t[e].i0-s,n])}return a.push([t[0].i0-s,t[0].b0-s]),c?e.wavyPolygon(a,c,f):`M${a.map(([e,t])=>f(e,t)).join(` L`)} Z`}).join(` `)}static wavyPolygon(e,t,n){let r=t*3,i=`M${n(...e[0])}`;return e.forEach(([a,o],s)=>{let[c,l]=e[(s+1)%e.length],u=Math.hypot(c-a,l-o);if(u<r){i+=` L${n(c,l)}`;return}let d=Math.round(u/r),[f,p]=[(c-a)/d,(l-o)/d],[m,h]=[-(l-o)/u*t*2,(c-a)/u*t*2];for(let e=0;e<d;e++){let t=e%2?-1:1;i+=` Q${n(a+f*(e+.5)+m*t,o+p*(e+.5)+h*t)} ${n(a+f*(e+1),o+p*(e+1))}`}}),`${i} Z`}computeOverlayRects(t,n,r,i){if(t.decoration?.style?.layout===`bounds`)return r.map(e=>i?{left:e.left-i,right:e.right+i,top:e.top-i,bottom:e.bottom+i,width:e.width+i*2,height:e.height+i*2}:e);let a=t.decoration.style,o=a.type,s=o===G.Underline||o===G.Strikethrough,c=o===G.Strikethrough,l=c?a.thickness:void 0,u=c&&a.lineStyle===`wavy`,d,f=[];if(s||o===G.Outline||o===G.HighlightUnderline){let n=Wi(t.range,[`rt`,`rp`]);n.length&&(f=e.replacedContentRects(t.range),d=s?n:[...n,...f])}d??(d=e.rangeBoxes(t.range));let p=e.mergeLineRects(Ki(d,!0,n.isVertical,s?0:i),n,s?f:void 0);return p=p.sort((e,t)=>n.isVertical?(n.isVertLR?1:-1)*(e.left-t.left):e.top-t.top),p.map(e=>{let t=e;if(c){let r=l===void 0?n.blockSize(e)*.1:l*this.effectiveZoom(),i=u?r*3:r,a=n.blockStart(e)+n.blockSize(e)/2-i/2;t=n.isVertical?{left:a,right:a+i,top:e.top,bottom:e.bottom,width:i,height:e.height}:{top:a,bottom:a+i,left:e.left,right:e.right,height:i,width:e.width}}if(i&&s){let e=i,r=c?0:i,[a,o]=n.isVertical?[r,e]:[e,r];t={left:t.left-a,right:t.right+a,top:t.top-o,bottom:t.bottom+o,width:t.width+a*2,height:t.height+o*2}}return t})}repositionItem(t,n){if(!t.container)return!0;let r=t.decoration.style;if(r.type!==G.Template){let e=r.type??G.Highlight;if(e===G.TextColor||e===G.Mask)return!0}let i=1/this.effectiveZoom(),a=this.scaledExpand(r),o=e.drawnBounds(t),s=this.outlineMetrics(t),c=s.inset,l=this.computeOverlayRects(t,n,o,a);if(e.isShapeOutline(r))return t.container.querySelector(`path`)?.setAttribute(`d`,this.outlinePath(t,n,i,l,o,c,ka+s.stroke/2+s.wave,s.wave)),!0;let u=Array.from(t.container.children);return u.length===l.length&&(u.forEach((e,r)=>{this.positionElement(t,n,i,e,l[r],o,c),this.sizeStrikethroughPattern(t,n,i,e,l[r])}),!0)}layout(t){if(this.experimentalHighlights&&!this.notTextFlag?.has(t.id))return this.experimentalLayout(t);let n=this.wnd.document.createElement(`div`);n.setAttribute(`id`,t.id),n.dataset.highlightId=t.decoration.id,n.style.setProperty(`pointer-events`,`none`);let r=this.overlayContext(),i=1/this.effectiveZoom(),a=this.scaledExpand(t.decoration.style),o=e.drawnBounds(t),s=t.decoration.style,c=this.outlineMetrics(t),l=c.inset,u;if(s.type===G.Template){s.stylesheet&&this.injectCustomStylesheet(s.stylesheet);let e=va(this.wnd,s.element);if(!e){t.container=n,t.clickableElements=[];return}e.style.setProperty(`pointer-events`,`none`),u=e}else{let d=s,f=d.type??G.Highlight,p=d.tint??ba(f);if(f===G.TextColor){t.container=n,t.clickableElements=[];return}if(f===G.Mask){t.container=n,t.clickableElements=[],this.scheduleMaskUpdate();return}let m=this.getCurrentDarkMode(),h=this.getBackgroundColor(),g=d.enforceContrast!==!1,_=d.lineStyle??`solid`;if(e.isShapeOutline(d)){let e=`http://www.w3.org/2000/svg`,s=this.wnd.document.createElementNS(e,`svg`);s.dataset.readium=`true`,s.style.cssText=`position:absolute;top:0;left:0;width:1px;height:1px;overflow:visible;writing-mode:horizontal-tb;pointer-events:none;z-index:${Wr}`;let u=this.wnd.document.createElementNS(e,`path`);u.setAttribute(`fill`,`none`),u.setAttribute(`stroke`,g?we(p,h):p),u.setAttribute(`stroke-width`,String(c.stroke)),_===`dashed`&&u.setAttribute(`stroke-dasharray`,`${c.stroke*3} ${c.stroke*2}`),_===`dotted`&&(u.setAttribute(`stroke-dasharray`,`0 ${c.stroke*2}`),u.setAttribute(`stroke-linecap`,`round`)),u.setAttribute(`d`,this.outlinePath(t,r,i,this.computeOverlayRects(t,r,o,a),o,l,ka+c.stroke/2+c.wave,c.wave)),s.append(u),n.append(s),t.container=n,t.clickableElements=[];return}let ee=(()=>{switch(f){case G.Underline:{let e=g?we(p,h):p,n=d.layout===`bounds`;return this.underlineDeclarations(t,r,e,_,n).join(`; `)}case G.Strikethrough:{let t=g?we(p,h):p;if(d.layout===`bounds`){let e=d.thickness??1,[n,r]=_===`dashed`?[e*3,e*5]:_===`dotted`?[e,e*2]:[],i=n?`repeating-linear-gradient(45deg, black 0 ${n}px, transparent ${n}px ${r}px)`:null;return[`background: repeating-linear-gradient(-45deg, transparent, transparent 19px, ${t} 19px, ${t} ${19+e}px) !important`,`background-color: transparent !important`,i?`-webkit-mask-image: ${i} !important`:null,i?`mask-image: ${i} !important`:null,`box-sizing: border-box !important`].filter(Boolean).join(`; `)}return _===`wavy`||e.drawsOwnDots(_)?[`background-image: ${_===`wavy`?e.waveImage(t,r.isVertical):e.dotImage(t,r.isVertical)} !important`,`background-repeat: ${r.isVertical?`no-repeat round`:`round no-repeat`} !important`,`background-color: transparent !important`,`box-sizing: border-box !important`].join(`; `):_===`solid`?[`background-color: ${t} !important`,`box-sizing: border-box !important`].join(`; `):[`${r.isVertical?`border-left`:`border-top`}: 0 ${_} ${t} !important`,`background-color: transparent !important`,`box-sizing: border-box !important`].join(`; `)}case G.Outline:let n=g?we(p,h):p;return[`outline: ${c.stroke}px ${_} ${n} !important`,`outline-offset: ${ka}px !important`,`background-color: transparent !important`,`box-sizing: border-box !important`].join(`; `);case G.HighlightUnderline:{let e=g?we(p,h):p,{r:n,g:i,b:a}=T(e),o=`rgba(${n}, ${i}, ${a}, 0.3)`,s=d.layout===`bounds`;return this.underlineDeclarations(t,r,e,_,s,o).join(`; `)}case G.Highlight:default:return[`background-color: ${g?we(p,h):p} !important`,`mix-blend-mode: ${m?`exclusion`:`multiply`} !important`,`opacity: 1 !important`,`box-sizing: border-box !important`,`transform: translateZ(0) !important`].join(`; `)}})(),v=this.wnd.document.createElement(`template`);v.innerHTML=`<div data-readium="true" class="readium-${f}" style="${ee}"></div>`.trim(),u=v.content.firstElementChild}let d=this.computeOverlayRects(t,r,o,a);for(let e of d){let a=u.cloneNode(!0);a.style.setProperty(`pointer-events`,`none`),this.positionElement(t,r,i,a,e,o,l),this.sizeStrikethroughPattern(t,r,i,a,e),n.append(a)}t.container=n,t.clickableElements=Array.from(n.querySelectorAll(`[data-activable='1']`)),t.clickableElements.length||(t.clickableElements=Array.from(n.children))}renderLayout(e){e.forEach(e=>this.pendingRender.add(e)),this.wnd.cancelAnimationFrame(this.currentRender),this.currentRender=this.wnd.requestAnimationFrame(()=>{e=Array.from(this.pendingRender).filter(e=>this.items.includes(e)&&(!this.experimentalHighlights||!!this.notTextFlag?.has(e.id))),this.pendingRender.clear(),e.length!==0&&this.requireContainer().append(...e.map(e=>e.container).filter(e=>!!e))})}requireShadowHost(){return this.shadowHost&&this.shadowRoot||(this.shadowHost=this.wnd.document.createElement(`div`),this.shadowHost.style.cssText=`position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none`,this.wnd.document.body.appendChild(this.shadowHost),this.shadowRoot=this.shadowHost.attachShadow({mode:`open`})),this.shadowHost}overlayContext(){return V(this.wnd,this.requireShadowHost())}requireContainer(e=!1){if(e){let e;return this.wnd.document.getElementById(`${this.id}-style`)?e=this.wnd.document.getElementById(`${this.id}-style`):(e=this.wnd.document.createElement(`style`),e.dataset.readium=`true`,e.id=`${this.id}-style`,this.wnd.document.head.appendChild(e)),e}return this.container||(this.requireShadowHost(),this.container=this.wnd.document.createElement(`div`),this.container.setAttribute(`id`,this.id),this.container.dataset.group=this.name,this.container.dataset.readium=`true`,this.container.style.setProperty(`pointer-events`,`none`),this.container.style.display=`contents`,this.shadowRoot.appendChild(this.container)),this.container}getCurrentDarkMode(){return ti(this.wnd,`--USER__appearance`)===`readium-night-on`||ye(this.getBackgroundColor())}getBackgroundColor(){return ti(this.wnd,`--USER__backgroundColor`)||this.wnd.getComputedStyle(this.wnd.document.documentElement).getPropertyValue(`background-color`)}scheduleMaskUpdate(){this.maskFrame||(this.maskFrame=this.wnd.requestAnimationFrame(()=>{this.maskFrame=0,this.updateSharedMask()}))}removeShadowHost(){this.shadowHost?.remove(),this.shadowHost=void 0,this.shadowRoot=void 0}opaqueBackgroundColor(){let e=this.getBackgroundColor().trim();return!e||e===`transparent`||/^rgba\(.*,\s*(0|0?\.0+)\s*\)$|\/\s*(0|0?\.0+)\s*\)$/.test(e)?void 0:e}updateSharedMask(){let t=this.items.filter(e=>e.decoration.style?.type===G.Mask);if(t.length===0){this.maskSvg&&(this.maskSvg.remove(),this.maskSvg=void 0),this.container||this.removeShadowHost();return}this.maskSvg&&(this.maskSvg.style.display=`none`);let n=this.overlayContext(),r=1/this.effectiveZoom(),i=this.wnd.document.documentElement,a=i.scrollWidth*r,o=i.scrollHeight*r,s=this.wnd.document.scrollingElement,c=(((n.isVertical?!n.isVertLR:Vr(this.wnd,i))?s.clientWidth-s.scrollWidth:0)-s.scrollLeft+n.xDocOffset)*r,l=(-s.scrollTop+n.yDocOffset)*r,u=[];for(let r of t){let t=r.decoration.style,i=t.layout??`boxes`,a=t.width??`wrap`,o=this.scaledExpand(t),s=e.drawnBounds(r),c=i===`bounds`?s.map(e=>o?{left:e.left-o,top:e.top-o,right:e.right+o,bottom:e.bottom+o,width:e.width+o*2,height:e.height+o*2}:e):Ki(e.rangeBoxes(r.range),!1,!1,o);for(let t of c){let r;switch(a){case`viewport`:{let e=Math.floor(n.inlineStart(t)/n.viewportInlineSize)*n.viewportInlineSize;r=n.toRect(e,n.blockStart(t),n.viewportInlineSize,n.blockSize(t));break}case`page`:{let e=Math.floor(n.inlineStart(t)/n.pageInlineSize)*n.pageInlineSize;r=n.toRect(e,n.blockStart(t),n.pageInlineSize,n.blockSize(t));break}case`bounds`:{let i=s[e.fragmentIndex(s,t,n)];r=n.toRect(n.inlineStart(i),n.blockStart(t),n.inlineSize(i),n.blockSize(t));break}default:r=n.toRect(n.inlineStart(t),n.blockStart(t),n.inlineSize(t),n.blockSize(t))}u.push(r)}}let d=this.closeInterlines(n,u).map(e=>{let t=(e.left+n.xDocOffset)*r;return`M${t} ${(e.top+n.yDocOffset)*r} H${(e.right+n.xDocOffset)*r} V${(e.bottom+n.yDocOffset)*r} H${t} Z`}).join(` `),f=`http://www.w3.org/2000/svg`;if(!this.maskSvg){this.requireShadowHost(),this.maskSvg=this.wnd.document.createElementNS(f,`svg`),this.maskSvg.style.cssText=`position:absolute;top:0;left:0;width:${a}px;height:${o}px;pointer-events:none;z-index:${Wr-1}`,this.maskSvg.dataset.readium=`true`;let e=this.wnd.document.createElementNS(f,`defs`),t=this.wnd.document.createElementNS(f,`mask`),n=`${this.id}-mask-holes`;t.setAttribute(`id`,n),t.setAttribute(`maskUnits`,`userSpaceOnUse`);let r=this.wnd.document.createElementNS(f,`rect`);r.setAttribute(`fill`,`white`);let i=this.wnd.document.createElementNS(f,`path`);i.setAttribute(`fill`,`black`),t.append(r,i),e.appendChild(t),this.maskSvg.appendChild(e);let s=this.wnd.document.createElementNS(f,`rect`);s.setAttribute(`id`,`${this.id}-mask-rect`),s.setAttribute(`mask`,`url(#${n})`),s.style.pointerEvents=`none`,this.maskSvg.appendChild(s),this.shadowRoot.appendChild(this.maskSvg)}this.maskSvg.style.display=``,this.maskSvg.style.left=`${c}px`,this.maskSvg.style.top=`${l}px`,this.maskSvg.style.width=`${a}px`,this.maskSvg.style.height=`${o}px`,this.maskSvg.setAttribute(`viewBox`,`${c} ${l} ${a} ${o}`);let p=this.maskSvg.querySelector(`mask`);p?.setAttribute(`x`,String(c)),p?.setAttribute(`y`,String(l)),p?.setAttribute(`width`,String(a)),p?.setAttribute(`height`,String(o));let m=this.maskSvg.querySelector(`mask > rect`);m?.setAttribute(`x`,String(c)),m?.setAttribute(`y`,String(l)),m?.setAttribute(`width`,String(a)),m?.setAttribute(`height`,String(o));let h=this.maskSvg.querySelector(`mask > path`);h&&h.setAttribute(`d`,d);let g=this.maskSvg.querySelector(`:scope > rect`);if(g){let e=t[0].decoration.style.tint,n=e?void 0:this.opaqueBackgroundColor(),r=e??n??ba(G.Mask),i=n?`0.5`:`1`;g.setAttribute(`x`,String(c)),g.setAttribute(`y`,String(l)),g.setAttribute(`width`,String(a)),g.setAttribute(`height`,String(o)),g.setAttribute(`fill`,r),g.setAttribute(`fill-opacity`,i)}}closeInterlines(e,t){let n=t.map(t=>({i0:e.inlineStart(t),i1:e.inlineStart(t)+e.inlineSize(t),b0:e.blockStart(t),b1:e.blockStart(t)+e.blockSize(t)})).sort((e,t)=>e.b0-t.b0),r=n.map(e=>e.b1),i=n.map(e=>e.b0);return n.forEach((e,t)=>{let a=n.flatMap((t,n)=>t.b0>=e.b1&&t.i0<e.i1&&t.i1>e.i0&&t.b0-e.b1<Math.min(e.b1-e.b0,t.b1-t.b0)?[n]:[]);if(a.length===0)return;let o=n[a[0]],s=(e.b1+o.b0)/2;r[t]=s;for(let e of a)n[e].b0<o.b1&&(i[e]=Math.min(i[e],s))}),n.map((t,n)=>e.toRect(t.i0,i[n],t.i1-t.i0,r[n]-i[n]))}injectCustomStylesheet(e){let t=`${this.id}-custom-style`,n=this.wnd.document.getElementById(t);n||(n=this.wnd.document.createElement(`style`),n.id=t,n.dataset.readium=`true`,this.wnd.document.head.appendChild(n)),n.innerHTML=e}clearContainer(){if(this.experimentalHighlights){let e=this.wnd.CSS.highlights;for(let t of this._tintSubKeys.values())e.delete(t);this._tintSubKeys.clear(),this._subKeyCounter=0}this.wnd.document.getElementById(`${this.id}-custom-style`)?.remove(),this.container&&(this.container.remove(),this.container=void 0)}},Ma=class e extends Ir{constructor(){super(...arguments),this.observedResizeTargets=new Map,this.resizeFrame=0,this.lastGroupId=0,this.groups=new Map,this.handleResizer=this.handleResize.bind(this),this.scrollScheduled=!1,this.handleScroller=this.handleScroll.bind(this)}cleanup(){this.groups.forEach(e=>e.destroy()),this.groups.clear(),this.observedResizeTargets.clear()}updateHighlightStyles(){this.groups.forEach(e=>{e.requestLayout()})}handleResize(){this.wnd.clearTimeout(this.resizeFrame),this.resizeFrame=this.wnd.setTimeout(()=>{this.groups.forEach(e=>e.requestLayout())},50)}handleScroll(){this.scrollScheduled||(this.scrollScheduled=!0,this.wnd.requestAnimationFrame(()=>{this.scrollScheduled=!1,this.groups.forEach(e=>{e.hasOverlayItems&&e.repositionOverlays()})}))}mount(t,n){return this.wnd=t,n.register(`decorate`,e.moduleName,(e,r)=>{let i=e;(i.action===`add`||i.action===`update`)&&i.decoration.locator&&(i.decoration.locator=M.deserialize(i.decoration.locator)),this.groups.has(i.group)||this.groups.set(i.group,new ja(t,n,`readium-decoration-${this.lastGroupId++}`,i.group));let a=this.groups.get(i.group);switch(i.action){case`add`:a?.add(i.decoration);break;case`remove`:a?.remove(i.decoration.id);break;case`clear`:a?.clear();break;case`update`:a?.update(i.decoration)}r(!0)}),n.register(`decoration_resize`,e.moduleName,(e,t)=>{let n=e;n.action===`watch`?this.addDecorationResizeTarget(n.selector):this.removeDecorationResizeTarget(n.selector),t(!0)}),n.register(`decoration_activatable`,e.moduleName,(e,t)=>{let n=e,r=this.groups.get(n.group);r&&(r.activatable=n.activatable),t(!0)}),n.register(`decoration_hoverable`,e.moduleName,(e,t)=>{let n=e,r=this.groups.get(n.group);r&&(r.hoverable=n.hoverable),t(!0)}),this.resizeObserver=new ResizeObserver(()=>t.requestAnimationFrame(()=>this.handleResize())),this.resizeObserver.observe(t.document.documentElement),t.addEventListener(`orientationchange`,this.handleResizer),t.addEventListener(`resize`,this.handleResizer),t.addEventListener(`scroll`,this.handleScroller,{passive:!0,capture:!0}),this.styleObserver=new MutationObserver(e=>{e.some(e=>e.type===`attributes`&&e.attributeName===`style`&&e.oldValue!==e.target.getAttribute(`style`))&&this.updateHighlightStyles()}),this.styleObserver.observe(t.document.documentElement,{attributes:!0,attributeFilter:[`style`],attributeOldValue:!0}),n.log(`Decorator Mounted`),!0}unmount(t,n){return t.removeEventListener(`orientationchange`,this.handleResizer),t.removeEventListener(`resize`,this.handleResizer),t.removeEventListener(`scroll`,this.handleScroller,{capture:!0}),n.unregisterAll(e.moduleName),this.resizeObserver.disconnect(),this.styleObserver.disconnect(),this.cleanup(),n.log(`Decorator Unmounted`),!0}addDecorationResizeTarget(e){let t=this.observedResizeTargets.get(e);t&&this.resizeObserver.unobserve(t);let n=this.wnd.document.querySelector(e);n?(this.resizeObserver.observe(n),this.observedResizeTargets.set(e,n)):this.observedResizeTargets.delete(e)}removeDecorationResizeTarget(e){let t=this.observedResizeTargets.get(e);t&&(this.resizeObserver.unobserve(t),this.observedResizeTargets.delete(e))}};Ma.moduleName=`decorator`;var Na=Ma,Pa=class e extends Ir{wndOnErr(e){this.comms?.send(`error`,{message:e.message,filename:e.filename,lineno:e.lineno,colno:e.colno})}mount(t,n){return this.comms=n,t.addEventListener(`error`,this.wndOnErr,!1),n.register(`get_properties`,e.moduleName,(e,n)=>{$r(t),n(!0)}),n.register(`update_properties`,e.moduleName,(e,n)=>{ei(t,e),n(!0)}),n.register(`set_property`,e.moduleName,(e,n)=>{let r=e;ni(t,r[0],r[1]),n(!0)}),n.register(`remove_property`,e.moduleName,(e,n)=>{ri(t,e),n(!0)}),n.register(`activate`,e.moduleName,(e,t)=>{t(!0)}),n.log(`WebPubSetup Mounted`),!0}unmount(t,n){return n.unregisterAll(e.moduleName),t.removeEventListener(`error`,this.wndOnErr),n.log(`WebPubSetup Unmounted`),!0}};Pa.moduleName=`webpub_setup`;var Fa=Pa,Ia=class e extends Ir{constructor(){super(...arguments),this.styleElement=null,this.beforePrintHandler=null,this.configApplied=!1}setupPrintProtection(e,t){if(!t.disable)return;let n=e.document.createElement(`style`);n.textContent=`
            @media print {
                body * {
                    display: none !important;
                }
                body::after {
                    content: "${t.watermark||`Printing has been disabled`}";
                    font-size: 200%;
                    display: block;
                    text-align: center;
                    margin-top: 50vh;
                    transform: translateY(-50%);
                }
            }
        `,e.document.head.appendChild(n),this.styleElement=n,this.beforePrintHandler=e=>(e.preventDefault(),!1),e.addEventListener(`beforeprint`,this.beforePrintHandler)}registerPrintHandlers(){this.comms?.register(`print_protection`,e.moduleName,e=>{let t=e;return this.configApplied||(this.configApplied=!0,this.setupPrintProtection(this.wnd,t),this.comms?.log(`Print protection configuration applied`)),!0})}mount(e,t){return this.wnd=e,this.comms=t,this.registerPrintHandlers(),!0}unmount(t,n){return this.beforePrintHandler&&(t.removeEventListener(`beforeprint`,this.beforePrintHandler),this.beforePrintHandler=null),this.styleElement?.parentNode&&(this.styleElement.parentNode.removeChild(this.styleElement),this.styleElement=null),this.comms?.unregisterAll(e.moduleName),this.configApplied=!1,!0}};Ia.moduleName=`print_protection`;var La=Ia,Ra=`readium-cjk-vertical-snapper-style`,za=class e extends B{constructor(){super(...arguments),this.patternAnalyzer=null,this.lastScrollTime=0,this.isScrollProtectionEnabled=!1,this.initialScrollHandled=!1,this.isScrolling=!1,this.lastScrollLeft=0,this.isResizing=!1,this.resizeDebounce=null,this.verticalLR=!1,this.handleScroll=e=>{if(this.comms.ready&&!this.isResizing){if(!this.initialScrollHandled){this.lastScrollLeft=Math.abs(this.doc().scrollLeft),this.initialScrollHandled=!0,this.reportProgress();return}this.isScrolling||(this.isScrolling=!0,this.wnd.requestAnimationFrame(()=>{this.reportProgress();let t=Math.abs(this.doc().scrollLeft),n=t-this.lastScrollLeft;if(this.lastScrollLeft=t,this.isScrollProtectionEnabled&&Math.abs(n)>5){let t=Date.now(),r=t-(this.lastScrollTime||t);if(this.patternAnalyzer&&this.patternAnalyzer.analyze(n>0?`down`:`up`,Math.abs(n),r)){let t=e.target&&`tagName`in e.target?{tagName:e.target.tagName}:null;this.comms?.send(`content_protection`,{type:`suspicious_scrolling`,timestamp:Date.now(),scrollDelta:n,scrollDirection:n>0?`left`:`right`,targetElement:t})}this.lastScrollTime=t}this.comms.send(`scroll`,n),this.isScrolling=!1}))}}}doc(){return this.wnd.document.scrollingElement}scrollable(){return Math.max(0,this.doc().scrollWidth-this.wnd.innerWidth)}hasScrolledPast(e){let t=e.getBoundingClientRect(),n=this.wnd.innerWidth/2,r=this.wnd.innerWidth*B.CENTER_TOLERANCE;return this.verticalLR?t.right<=n+r:t.left>=n-r}inCenterBand(e){let t=e.getBoundingClientRect(),n=this.wnd.innerWidth/2,r=this.wnd.innerWidth*B.CENTER_TOLERANCE,i=n-r,a=n+r;return t.width===0?t.left<=a&&t.left>=i:Math.max(0,Math.min(t.right,a)-Math.max(t.left,i))/t.width>=B.CENTER_TOLERANCE}fragmentStart(e){return e.getBoundingClientRect().left+Math.abs(this.doc().scrollLeft)}currentScrollExtent(){return{pos:Math.abs(this.doc().scrollLeft),size:this.wnd.innerWidth}}rectStart(e){let t=Math.abs(this.doc().scrollLeft);return this.verticalLR?e.left+t:t+this.wnd.innerWidth-e.right}reportProgress(e){if(!this.comms.ready)return;let t=this.doc().scrollWidth,n=this.wnd.innerWidth,r=Math.max(1,t-n),i=Math.abs(this.doc().scrollLeft),a=Math.max(0,Math.min(1,i/r)),o=Math.max(0,Math.min(1,(i+n)/t));this.comms.send(`progress`,{start:a,end:o,fragmentId:e===void 0?this.currentTimelineFragment():e,visibleFragmentIds:this.sortedVisibleFragmentIds()}),this.sendTextLayout()}enableScrollProtection(){this.patternAnalyzer||(this.patternAnalyzer=new yi(gi),this.isScrollProtectionEnabled=!0,this.comms?.log(`Scroll protection enabled`))}mount(t,n){this.wnd=t,this.comms=n,this.initialScrollHandled=!1,this.lastScrollLeft=0,this.isResizing=!1,this.verticalLR=Hr(t),this.resizeDebounce&&(this.wnd.clearTimeout(this.resizeDebounce),this.resizeDebounce=null),t.navigator.epubReadingSystem&&(t.navigator.epubReadingSystem.layoutStyle=`scrolling`);let r=t.document.createElement(`style`);return r.dataset.readium=`true`,r.id=Ra,r.textContent=`
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
        `,t.document.head.appendChild(r),this.resizeObserver=new ResizeObserver(()=>{this.resizeDebounce&&this.wnd.clearTimeout(this.resizeDebounce),this.isResizing=!0,this.resizeDebounce=this.wnd.setTimeout(()=>{this.isResizing=!1,this.resizeDebounce=null,this.refreshFragmentStarts(),this.reportProgress(),this.sendTextLayout(!0)},50)}),this.resizeObserver.observe(t.document.body),t.addEventListener(`scroll`,this.handleScroll,{passive:!0}),n.register(`force_webkit_recalc`,e.moduleName,()=>{Jr(this.wnd);let e=this.doc().scrollLeft;this.verticalLR?this.doc().scrollLeft=e>1?e-1:e+1:this.doc().scrollLeft=e<-1?e+1:e-1,this.doc().scrollLeft=e}),this.registerTextLayout(t,n,e.moduleName),this.registerNavigationLock(t,n,e.moduleName),n.register(`go_progression`,e.moduleName,(e,t)=>{let r=e;r<0||r>1?(n.send(`error`,{message:`go_progression must be given a position from 0.0 to 1.0`}),t(!1)):this.wnd.requestAnimationFrame(()=>{let e=this.scrollable()*r;this.doc().scrollLeft=this.verticalLR?e:-e,this.reportProgress(this.fragmentFromGeometry()),H(this.wnd),t(!0)})}),n.register(`go_id`,e.moduleName,(e,n)=>{let r=t.document.getElementById(e);r?this.wnd.requestAnimationFrame(()=>{this.doc().scrollLeft+=r.getBoundingClientRect().left-t.innerWidth/2;let i=e;this.reportProgress(this.timelineEntries.has(i)?i:this.nearestPrecedingTimelineEntry(r)),H(this.wnd),n(!0)}):n(!1)}),n.register(`go_text`,e.moduleName,(e,n)=>{let r=B.rangeOf(t,e);r?this.wnd.requestAnimationFrame(()=>{this.doc().scrollLeft+=r.getBoundingClientRect().left-t.innerWidth/2,this.reportProgress(this.nearestPrecedingTimelineEntry(r.startContainer)),H(this.wnd),n(!0)}):n(!1)}),n.register(`go_start`,e.moduleName,(e,t)=>{if(this.doc().scrollLeft===0)return t(!1);this.doc().scrollLeft=0,this.reportProgress(this.firstFragmentIfReached()),t(!0)}),n.register(`go_end`,e.moduleName,(e,t)=>{if(Math.abs(this.doc().scrollLeft)===this.scrollable())return t(!1);this.doc().scrollLeft=this.verticalLR?this.scrollable():-this.scrollable(),this.reportProgress(this.sortedFragmentIds[this.sortedFragmentIds.length-1]),t(!0)}),n.register([`go_next`,`go_prev`],e.moduleName,(e,t)=>t(!1)),n.register(`unfocus`,e.moduleName,(e,t)=>{H(this.wnd),t(!0)}),n.register(`scroll_protection`,e.moduleName,(e,t)=>{this.enableScrollProtection(),t(!0)}),n.register(`focus`,e.moduleName,(e,t)=>{this.reportProgress(),t(!0)}),n.register(`first_visible_locator`,e.moduleName,(e,n)=>{let r=ui(t,!0);this.comms.send(`first_visible_locator`,r.serialize()),n(!0)}),n.register(`timeline_entries`,e.moduleName,(e,n)=>{this.updateTimelineEntries(Array.isArray(e)?e:[],t),n(!0)}),n.log(`CJKVerticalSnapper Mounted`),!0}unmount(t,n){return n.unregisterAll(e.moduleName),this.unwatchTextLayout(),this.unlockNavigation(t),this.resizeObserver.disconnect(),this.handleScroll&&t.removeEventListener(`scroll`,this.handleScroll),t.document.getElementById(Ra)?.remove(),this.patternAnalyzer&&(this.patternAnalyzer.clear(),this.patternAnalyzer=null,this.isScrollProtectionEnabled=!1),this.timelineEntries.clear(),this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts.clear(),n.log(`CJKVerticalSnapper Unmounted`),!0}};za.moduleName=`cjk_vertical_snapper`;var Ba=za,Va=[`fixed_setup`,`decorator`,`peripherals`,`print_protection`],Ha=[`reflowable_setup`,`decorator`,`peripherals`,`column_snapper`,`scroll_snapper`,`cjk_vertical_snapper`,`print_protection`],Ua=new Map([pa,ua,Fa,Oi,aa,Na,Ci,Ei,Ba,La].map(e=>[e.moduleName,e])),Wa=class{constructor(e=window,t=[]){this.loadedModules=[],this.wnd=e,e._readium_cssSelectorGenerator??(e._readium_cssSelectorGenerator={getCssSelector:sr}),this.comms=new fr(e);let n=[...new Set(t)];if(n.length){if(typeof e>`u`)throw Error(`Loader is not in a web browser`);e.parent!==e&&this.comms.log(`Loader is probably in a frame`),this.loadedModules=n.map(e=>{let t=this.loadModule(e);if(t)return t.mount(this.wnd,this.comms),t}).filter(e=>e!==void 0)}}loadModule(e){let t=Ua.get(e);return t===void 0?(this.comms.log(`Module "${name}" does not exist in the library`),t):new t}addModule(e){let t=this.loadModule(e);return!t||!t.mount(this.wnd,this.comms)?!1:(this.loadedModules.push(t),!0)}removeModule(e){let t=Ua.get(e);if(t===void 0)return this.comms.log(`Module "${e}" does not exist in the library`),!1;let n=this.loadedModules.findIndex(e=>e instanceof t);return n<0?!1:(this.loadedModules[n].unmount(this.wnd,this.comms),this.loadedModules.splice(n,1),!0)}destroy(){this.comms.destroy(),this.loadedModules.forEach(e=>e.unmount(this.wnd,this.comms)),this.loadedModules=[]}},Ga={type:`developer_tools`,keyCombos:[{keyCode:73,meta:!0,alt:!0},{keyCode:73,ctrl:!0,shift:!0},{keyCode:74,meta:!0,alt:!0},{keyCode:74,ctrl:!0,shift:!0},{keyCode:85,meta:!0,alt:!0},{keyCode:67,meta:!0,alt:!0},{keyCode:67,meta:!0,shift:!0},{keyCode:67,ctrl:!0,shift:!0},{keyCode:65,meta:!0,alt:!0},{keyCode:84,meta:!0,shift:!0,alt:!0},{keyCode:67,shift:!0,alt:!0},{keyCode:123},{keyCode:123,shift:!0},{keyCode:123,ctrl:!0,shift:!0},{keyCode:123,meta:!0,alt:!0}]},Ka={type:`select_all`,keyCombos:[{keyCode:65,meta:!0},{keyCode:65,ctrl:!0}]},qa={type:`print`,keyCombos:[{keyCode:80,meta:!0},{keyCode:80,ctrl:!0},{keyCode:80,meta:!0,shift:!0},{keyCode:80,ctrl:!0,shift:!0},{keyCode:80,meta:!0,alt:!0},{keyCode:80,ctrl:!0,alt:!0}]},Ja={type:`save`,keyCombos:[{keyCode:83,meta:!0},{keyCode:83,ctrl:!0}]},Ya=class{mergeKeyboardPeripherals(e,t=[]){let n=[],r=t.filter(e=>![`developer_tools`,`select_all`,`print`,`save`].includes(e.type));e.disableSelectAll&&n.push(Ka),e.disableSave&&n.push(Ja),e.monitorDevTools&&n.push(Ga),e.protectPrinting?.disable&&n.push(qa);let i=[...n];for(let e of r){let t=e.keyCombos.filter(e=>!n.some(t=>t.keyCombos.some(n=>e.keyCode===n.keyCode&&e.ctrl===n.ctrl&&e.shift===n.shift&&e.alt===n.alt&&e.meta===n.meta&&(i.includes(t)||e.condition===n.condition))));t.length>0&&n.push({...e,keyCombos:t})}return n}},Xa=class e extends Ya{constructor(){super(...arguments),this.viewportWatchers=new Set}watchViewport(e){return this.viewportWatchers.add(e),()=>{this.viewportWatchers.delete(e)}}notifyViewportChange(t){let n=this.viewport,r={readingOrder:[...n.readingOrder],progressions:new Map([...n.progressions].map(([e,t])=>[e,{...t}])),positions:n.positions?[...n.positions]:null};this.notifiedViewport&&e.sameViewport(this.notifiedViewport,r)||(this.notifiedViewport=r,t(r),this.viewportWatchers.forEach(e=>e(r)))}static sameViewport(e,t){let n=(e,t)=>e===t||!!e&&!!t&&e.length===t.length&&e.every((e,n)=>e===t[n]);return n(e.readingOrder,t.readingOrder)&&n(e.positions,t.positions)&&e.readingOrder.every(n=>e.progressions.get(n)?.start===t.progressions.get(n)?.start&&e.progressions.get(n)?.end===t.progressions.get(n)?.end)}goLeft(e=!1,t){this.readingProgression===R.ltr?this.goBackward(e,t):this.readingProgression===R.rtl&&this.goForward(e,t)}goRight(e=!1,t){this.readingProgression===R.ltr?this.goForward(e,t):this.readingProgression===R.rtl&&this.goBackward(e,t)}},Za=new Set(Object.values(G));function Qa(e,t){return e===G.TextColor?typeof window<`u`&&`Highlight`in window:Za.has(e)?!0:!!t?.[e]}function $a(e,t){let{style:n}=e;if(n.type===G.Template){let t=n;return{...e,style:{...t,element:eo(t,e)}}}if(n.type&&t?.[n.type]){let r=t[n.type];return{...e,style:{type:G.Template,layout:r.layout,width:r.width,stylesheet:r.stylesheet,element:eo(r,e)}}}return e}function eo(e,t){return typeof e.element==`function`?e.element(t):e.element}function to(e,t){if(e.type!==t.type)return!1;if(e.type===G.Template){let n=e,r=t;return n.layout===r.layout&&n.width===r.width&&n.stylesheet===r.stylesheet}let n=e,r=t;return n.tint===r.tint&&n.layout===r.layout&&n.width===r.width&&(n.enforceContrast??!0)===(r.enforceContrast??!0)&&(n.expand??0)===(r.expand??0)&&n.thickness===r.thickness&&n.lineStyle===r.lineStyle}function no(e,t){return e.locator.href===t.locator.href&&JSON.stringify(e.locator.locations?.serialize?.()??e.locator.locations)===JSON.stringify(t.locator.locations?.serialize?.()??t.locator.locations)&&JSON.stringify(e.locator.text??null)===JSON.stringify(t.locator.text??null)&&to(e.style,t.style)&&JSON.stringify(e.extras??null)===JSON.stringify(t.extras??null)}var ro=1e4,io=5e3,ao=class{constructor(e,t){this.registry=new Map,this._ready=!1,this.listenerBuffer=[],this.visibleTime=0,this.visibleSince=document.hidden?void 0:performance.now(),this.visibilityHandler=this.handleVisibility.bind(this),this.handler=this.handle.bind(this),this.wnd=e,this.origin=t;try{this.channelId=window.crypto.randomUUID()}catch{this.channelId=dr()}this.startGc(),window.addEventListener(`message`,this.handler),this.send(`_ping`,void 0)}set listener(e){this.listenerBuffer.length>0&&this.listenerBuffer.forEach(t=>e(t[0],t[1])),this.listenerBuffer=[],this._listener=e}clearListener(){typeof this._listener==`function`&&(this._listener=void 0)}startGc(){this.gc===void 0&&(this.handleVisibility(),document.addEventListener(`visibilitychange`,this.visibilityHandler),this.gc=setInterval(()=>{let e=this.visibleNow();this.registry.forEach((t,n)=>{e-t.time>ro&&(console.warn(n,`event for`,t.key,`was never handled!`),this.registry.delete(n))})},io))}stopGc(){this.visibleTime=this.visibleNow(),this.visibleSince=void 0,document.removeEventListener(`visibilitychange`,this.visibilityHandler),clearInterval(this.gc),this.gc=void 0}visibleNow(){return this.visibleTime+(this.visibleSince===void 0?0:performance.now()-this.visibleSince)}handleVisibility(){document.hidden?(this.visibleTime=this.visibleNow(),this.visibleSince=void 0):this.visibleSince===void 0&&(this.visibleSince=performance.now())}halt(){this._ready=!1,window.removeEventListener(`message`,this.handler),this.stopGc(),this._listener=void 0,this.registry.clear()}resume(){window.addEventListener(`message`,this.handler),this.startGc(),this._ready=!0}handle(e){let t=e.data;if(!t._readium)console.warn(`Ignoring`,t);else if(t._channel===this.channelId)switch(t.key){case`_ack`:{if(!t.id)return;let e=this.registry.get(t.id);if(!e)return;this.registry.delete(t.id),e.cb(!!t.data);return}case`_pong`:this._ready=!0;default:if(!this.ready)return;typeof this._listener==`function`?this._listener(t.key,t.data):this.listenerBuffer.push([t.key,t.data])}}get ready(){return this._ready}send(e,t,n,r=!1,i=[]){let a=dr();return n&&this.registry.set(a,{cb:n,time:this.visibleNow(),key:e}),this.wnd.postMessage({_readium:1,_channel:this.channelId,id:a,data:t,key:e,strict:r},`/`,i),a}},oo=class{constructor(e,t){this.config=e,this.onUpdate=t,this.unsubs=[],this.conditionValues=new Map}setup(){let e=!0,t=new Map;this.config.forEach(e=>e.keyCombos.forEach(e=>{if(e.condition){let n=t.get(e.condition)??[];n.push(e),t.set(e.condition,n)}})),t.forEach((t,n)=>{let r=n.subscribe(n=>{t.forEach(e=>this.conditionValues.set(e,n)),e||this.onUpdate(this.buildSerializable())});this.unsubs.push(r)}),e=!1,this.onUpdate(this.buildSerializable())}buildSerializable(){return this.config.map(e=>({...e,keyCombos:e.keyCombos.filter(e=>!e.condition||this.conditionValues.get(e)===!0).map(({condition:e,...t})=>t)})).filter(e=>e.keyCombos.length>0)}destroy(){this.unsubs.forEach(e=>e()),this.unsubs=[],this.conditionValues.clear()}};function so(){let e=Promise.resolve();return t=>{let n=e.then(t);return e=n.catch(()=>{}),n}}var co,lo;function uo(){if(lo)return co;lo=1;function e(e){if(typeof e!=`string`)throw TypeError(`Path must be a string. Received `+JSON.stringify(e))}function t(e,t){for(var n=``,r=0,i=-1,a=0,o,s=0;s<=e.length;++s){if(s<e.length)o=e.charCodeAt(s);else{if(o===47)break;o=47}if(o===47){if(i!==s-1&&a!==1){if(i!==s-1&&a===2){if(n.length<2||r!==2||n.charCodeAt(n.length-1)!==46||n.charCodeAt(n.length-2)!==46){if(n.length>2){var c=n.lastIndexOf(`/`);if(c!==n.length-1){c===-1?(n=``,r=0):(n=n.slice(0,c),r=n.length-1-n.lastIndexOf(`/`)),i=s,a=0;continue}}else if(n.length===2||n.length===1){n=``,r=0,i=s,a=0;continue}}t&&(n.length>0?n+=`/..`:n=`..`,r=2)}else n.length>0?n+=`/`+e.slice(i+1,s):n=e.slice(i+1,s),r=s-i-1}i=s,a=0}else o===46&&a!==-1?++a:a=-1}return n}function n(e,t){var n=t.dir||t.root,r=t.base||(t.name||``)+(t.ext||``);return n?n===t.root?n+r:n+e+r:r}var r={resolve:function(){for(var n=``,r=!1,i,a=arguments.length-1;a>=-1&&!r;a--){var o;a>=0?o=arguments[a]:(i===void 0&&(i=process.cwd()),o=i),e(o),o.length!==0&&(n=o+`/`+n,r=o.charCodeAt(0)===47)}return n=t(n,!r),r?n.length>0?`/`+n:`/`:n.length>0?n:`.`},normalize:function(n){if(e(n),n.length===0)return`.`;var r=n.charCodeAt(0)===47,i=n.charCodeAt(n.length-1)===47;return n=t(n,!r),n.length===0&&!r&&(n=`.`),n.length>0&&i&&(n+=`/`),r?`/`+n:n},isAbsolute:function(t){return e(t),t.length>0&&t.charCodeAt(0)===47},join:function(){if(arguments.length===0)return`.`;for(var t,n=0;n<arguments.length;++n){var i=arguments[n];e(i),i.length>0&&(t===void 0?t=i:t+=`/`+i)}return t===void 0?`.`:r.normalize(t)},relative:function(t,n){if(e(t),e(n),t===n||(t=r.resolve(t),n=r.resolve(n),t===n))return``;for(var i=1;i<t.length&&t.charCodeAt(i)===47;++i);for(var a=t.length,o=a-i,s=1;s<n.length&&n.charCodeAt(s)===47;++s);for(var c=n.length-s,l=o<c?o:c,u=-1,d=0;d<=l;++d){if(d===l){if(c>l){if(n.charCodeAt(s+d)===47)return n.slice(s+d+1);if(d===0)return n.slice(s+d)}else o>l&&(t.charCodeAt(i+d)===47?u=d:d===0&&(u=0));break}var f=t.charCodeAt(i+d);if(f!==n.charCodeAt(s+d))break;f===47&&(u=d)}var p=``;for(d=i+u+1;d<=a;++d)(d===a||t.charCodeAt(d)===47)&&(p.length===0?p+=`..`:p+=`/..`);return p.length>0?p+n.slice(s+u):(s+=u,n.charCodeAt(s)===47&&++s,n.slice(s))},_makeLong:function(e){return e},dirname:function(t){if(e(t),t.length===0)return`.`;for(var n=t.charCodeAt(0),r=n===47,i=-1,a=!0,o=t.length-1;o>=1;--o)if(n=t.charCodeAt(o),n===47){if(!a){i=o;break}}else a=!1;return i===-1?r?`/`:`.`:r&&i===1?`//`:t.slice(0,i)},basename:function(t,n){if(n!==void 0&&typeof n!=`string`)throw TypeError(`"ext" argument must be a string`);e(t);var r=0,i=-1,a=!0,o;if(n!==void 0&&n.length>0&&n.length<=t.length){if(n.length===t.length&&n===t)return``;var s=n.length-1,c=-1;for(o=t.length-1;o>=0;--o){var l=t.charCodeAt(o);if(l===47){if(!a){r=o+1;break}}else c===-1&&(a=!1,c=o+1),s>=0&&(l===n.charCodeAt(s)?--s===-1&&(i=o):(s=-1,i=c))}return r===i?i=c:i===-1&&(i=t.length),t.slice(r,i)}for(o=t.length-1;o>=0;--o)if(t.charCodeAt(o)===47){if(!a){r=o+1;break}}else i===-1&&(a=!1,i=o+1);return i===-1?``:t.slice(r,i)},extname:function(t){e(t);for(var n=-1,r=0,i=-1,a=!0,o=0,s=t.length-1;s>=0;--s){var c=t.charCodeAt(s);if(c===47){if(!a){r=s+1;break}}else i===-1&&(a=!1,i=s+1),c===46?n===-1?n=s:o!==1&&(o=1):n!==-1&&(o=-1)}return n===-1||i===-1||o===0||o===1&&n===i-1&&n===r+1?``:t.slice(n,i)},format:function(e){if(typeof e!=`object`||!e)throw TypeError(`The "pathObject" argument must be of type Object. Received type `+typeof e);return n(`/`,e)},parse:function(t){e(t);var n={root:``,dir:``,base:``,ext:``,name:``};if(t.length===0)return n;var r=t.charCodeAt(0),i=r===47,a;i?(n.root=`/`,a=1):a=0;for(var o=-1,s=0,c=-1,l=!0,u=t.length-1,d=0;u>=a;--u)if(r=t.charCodeAt(u),r===47){if(!l){s=u+1;break}}else c===-1&&(l=!1,c=u+1),r===46?o===-1?o=u:d!==1&&(d=1):o!==-1&&(d=-1);return o===-1||c===-1||d===0||d===1&&o===c-1&&o===s+1?c!==-1&&(n.base=n.name=s===0&&i?t.slice(1,c):t.slice(s,c)):(s===0&&i?(n.name=t.slice(1,o),n.base=t.slice(1,c)):(n.name=t.slice(s,o),n.base=t.slice(s,c)),n.ext=t.slice(o,c)),s>0?n.dir=t.slice(0,s-1):i&&(n.dir=`/`),n},sep:`/`,delimiter:`:`,win32:null,posix:null};return r.posix=r,co=r,co}var fo=uo();function po(e){let t=e.languages?.[0]?.toLowerCase(),n=e.readingProgression;if(t){if(t.startsWith(`zh`)||t.startsWith(`ja`)||t.startsWith(`ko`))return n===R.rtl?`cjk-vertical`:`cjk-horizontal`;if(t.startsWith(`mn-mong`))return`mongolian-vertical`;if(t.startsWith(`ar`)||t.startsWith(`fa`)||t.startsWith(`he`))return`rtl`}return`ltr`}var mo={experimentalHeaderFiltering:{description:`Attempts to filter out paragraphs that are implicitly headings or part of headers`,scope:`RS`,value:`readium-experimentalHeaderFiltering-on`},experimentalZoom:{description:`Attempts to filter out elements that are sized using viewport units and should not be scaled directly e.g. tables, images, iframes, etc.`,scope:`RS`,value:`readium-experimentalZoom-on`}},ho=(e=>(e.start=`start`,e.left=`left`,e.right=`right`,e.justify=`justify`,e))(ho||{}),go={range:[0,100],step:1},_o={range:[.7,4],step:.05},vo={range:[100,1e3],step:100},yo={range:[50,250],step:10},bo={range:[0,1],step:.125},xo={range:[1,2.5],step:.1},So={range:[20,100],step:1},Co={range:[0,3],step:.25},wo={range:[0,3],step:.25},To={range:[0,2],step:.125},Eo=class{constructor(){}toFlag(e){return`readium-${e}-on`}toUnitless(e){return e.toString()}toPercentage(e,t=!1){return t||e>0&&e<=1?`${Math.round(e*100)}%`:`${e}%`}toVw(e){let t=Math.round(e*100);return`${Math.min(t,100)}vw`}toVh(e){let t=Math.round(e*100);return`${Math.min(t,100)}vh`}toPx(e){return`${e}px`}toRem(e){return`${e}rem`}};function Do(e,t){return e==null||t==null||e<=t?e:void 0}function Oo(e,t){return e==null||t==null||e>=t?e:void 0}function K(e){return typeof e==`string`?e:e===null?null:void 0}function q(e){return typeof e==`boolean`||e==null?e:void 0}function ko(e,t){if(e!==void 0)return e===null?null:t[e]===void 0?void 0:e}function Ao(e){return typeof e==`boolean`||typeof e==`number`&&e>=0?e:e===null?null:void 0}function J(e){if(e!==void 0)return e===null?null:e<0?void 0:e}function jo(e,t){if(e===void 0)return;if(e===null)return null;let n=Math.min(...t),r=Math.max(...t);return e>=n&&e<=r?e:void 0}function Mo(e,t){return e===void 0?t:e}function No(e){if(e!==void 0)return e===null?null:e.filter(e=>e in mo)}var Y=class{constructor({initialValue:e=null,effectiveValue:t,isEffective:n,onChange:r}){this._value=e,this._effectiveValue=t,this._isEffective=n,this._onChange=r}set value(e){this._value=e,this._onChange(this._value)}get value(){return this._value}get effectiveValue(){return this._effectiveValue}get isEffective(){return this._isEffective}clear(){this._value=null}},X=class extends Y{set value(e){this._value=e,this._onChange(this._value)}get value(){return this._value}get effectiveValue(){return this._effectiveValue}get isEffective(){return this._isEffective}clear(){this._value=null}toggle(){this._value=!this._value,this._onChange(this._value)}},Po=class extends Y{constructor({initialValue:e=null,effectiveValue:t,isEffective:n,onChange:r,supportedValues:i}){super({initialValue:e,effectiveValue:t,isEffective:n,onChange:r}),this._supportedValues=i}set value(e){if(e&&!this._supportedValues.includes(e))throw Error(`Value '${String(e)}' is not in the supported values for this preference.`);this._value=e,this._onChange(this._value)}get value(){return this._value}get effectiveValue(){return this._effectiveValue}get isEffective(){return this._isEffective}get supportedValues(){return this._supportedValues}clear(){this._value=null}},Z=class extends Y{constructor({initialValue:e=null,effectiveValue:t,isEffective:n,onChange:r,supportedRange:i,step:a}){super({initialValue:e,effectiveValue:t,isEffective:n,onChange:r}),this._supportedRange=i,this._step=a,this._decimals=this._step.toString().includes(`.`)?this._step.toString().split(`.`)[1].length:0}set value(e){if(e&&(e<this._supportedRange[0]||e>this._supportedRange[1]))throw Error(`Value '${String(e)}' is out of the supported range for this preference.`);this._value=e,this._onChange(this._value)}get value(){return this._value}get effectiveValue(){return this._effectiveValue}get isEffective(){return this._isEffective}get supportedRange(){return this._supportedRange}get step(){return this._step}increment(){this._value&&this._value<this._supportedRange[1]&&(this._value=Math.min(Math.round((this._value+this._step)*10**this._decimals)/10**this._decimals,this._supportedRange[1]),this._onChange(this._value))}decrement(){this._value&&this._value>this._supportedRange[0]&&(this._value=Math.max(Math.round((this._value-this._step)*10**this._decimals)/10**this._decimals,this._supportedRange[0]),this._onChange(this._value))}format(e){return e.toString()}clear(){this._value=null}},Fo=e=>{if(`blob`in e&&e.blob.type)return e.blob.type;if(e.as===`script`)return`text/javascript`;if(e.as===`link`&&`url`in e){let t=e.url.toLowerCase();if(t.endsWith(`.css`))return`text/css`;if([`.js`,`.mjs`,`.cjs`].some(e=>t.endsWith(e)))return`text/javascript`}},Io=(e,t)=>{t.attributes&&Object.entries(t.attributes).forEach(([t,n])=>{t===`type`||t===`rel`||t===`href`||t===`src`||n!=null&&(typeof n==`boolean`?n&&e.setAttribute(t,``):e.setAttribute(t,n))})},Lo=(e,t,n)=>{let r=e.createElement(`script`);r.dataset.readium=`true`,t.id&&(r.id=t.id);let i=t.type||Fo(t);return i&&(r.type=i),Io(r,t),r.src=n,r},Ro=(e,t,n)=>{let r=e.createElement(`link`);r.dataset.readium=`true`,t.id&&(r.id=t.id),t.rel&&(r.rel=t.rel);let i=t.type||Fo(t);return i&&(r.type=i),Io(r,t),r.href=n,r},zo=class{constructor(e){this.blobStore=new Map,this.createdBlobUrls=new Set,this.allowedDomains=[],this.injectableIdCounter=0,this.allowedDomains=(e.allowedDomains||[]).map(e=>{try{return new URL(e),e}catch{throw Error(`Invalid allowed domain: "${e}". Must be a valid URL (e.g., "https://fonts.googleapis.com").`)}}),this.rules=e.rules.map(e=>{let t={...e};return e.prepend&&(t.prepend=e.prepend.map(e=>({...e,id:e.id||`injectable-${this.injectableIdCounter++}`})).reverse()),e.append&&(t.append=e.append.map(e=>({...e,id:e.id||`injectable-${this.injectableIdCounter++}`}))),t})}dispose(){for(let e of this.createdBlobUrls)try{URL.revokeObjectURL(e)}catch(t){console.warn(`Failed to revoke blob URL:`,e,t)}this.createdBlobUrls.clear()}getAllowedDomains(){return[...this.allowedDomains]}async injectForDocument(e,t){for(let n of this.rules)this.matchesRule(n,t)&&await this.applyRule(e,n)}matchesRule(e,t){let n=t.href;return e.resources.some(e=>e instanceof RegExp?e.test(n):n===e)}async getOrCreateBlobUrl(e){let t=e.id;if(this.blobStore.has(t)){let e=this.blobStore.get(t);return e.refCount++,e.url}if(`blob`in e){let n=URL.createObjectURL(e.blob);return this.blobStore.set(t,{url:n,refCount:1}),this.createdBlobUrls.add(n),n}throw Error(`Resource must have a blob property`)}async releaseBlobUrl(e){if(!this.createdBlobUrls.has(e))return;let t=Array.from(this.blobStore.values()).find(t=>t.url===e);if(t&&(t.refCount--,t.refCount<=0)){URL.revokeObjectURL(e),this.createdBlobUrls.delete(e);for(let[t,n]of this.blobStore.entries())if(n.url===e){this.blobStore.delete(t);break}}}async getResourceUrl(e,t){if(`url`in e){let n=new URL(e.url,t.baseURI).toString();if(!this.isValidUrl(n,t))throw Error(`Invalid URL: Only HTTPS, data:, blob:, or localhost HTTP URLs are allowed. Got: ${e.url}`);return n}return this.getOrCreateBlobUrl(e)}createPreloadLink(e,t,n){if(t.as!==`link`||t.rel!==`preload`)return;let r=Ro(e,{...t,rel:`preload`,attributes:{...t.attributes,as:t.as}},n);e.head.appendChild(r)}createElement(e,t,n){if(t.as===`script`)return Lo(e,t,n);if(t.as===`link`)return Ro(e,t,n);throw Error(`Unsupported element type: ${t.as}`)}async applyRule(e,t){let n=[],r=t.prepend?t.prepend.filter(t=>!t.condition||t.condition(e)):[],i=t.append?t.append.filter(t=>!t.condition||t.condition(e)):[];try{for(let t of r)await this.processInjectable(t,e,n,`prepend`);for(let t of i)await this.processInjectable(t,e,n,`append`)}catch(e){for(let{element:e,url:t}of n)try{e.remove(),await this.releaseBlobUrl(t)}catch(e){console.error(`Error during cleanup:`,e)}throw e}}async processInjectable(e,t,n,r){let i=e.target===`body`?t.body:t.head;if(!i)return;let a=null;try{if(a=await this.getResourceUrl(e,t),e.rel===`preload`&&`url`in e)this.createPreloadLink(t,e,a);else{let o=this.createElement(t,e,a);n.push({element:o,url:a}),r===`prepend`?i.prepend(o):i.append(o)}}catch(t){throw console.error(`Failed to process resource:`,t),a&&`blob`in e&&await this.releaseBlobUrl(a),t}}isValidUrl(e,t){try{let n=new URL(e,t.baseURI);if(n.protocol===`data:`||n.protocol===`blob:`&&this.createdBlobUrls.has(e))return!0;if(this.allowedDomains.length>0){let e=n.origin;return this.allowedDomains.some(t=>{let n=new URL(t).origin;return e===n})}return!1}catch{return!1}}},Bo=e=>e.replace(/\/\/.*/g,``).replace(/\/\*[\s\S]*?\*\//g,``).replace(/\n/g,``).replace(/\s+/g,` `),Vo=e=>e.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\r\n\t]+/g,``).replace(/ {2,}/g,` `),Ho='!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports._readium_cssSelectorGenerator=t():e._readium_cssSelectorGenerator=t()}(self,()=>(()=>{"use strict";const e={d:(t,n)=>{if(Array.isArray(n))for(var o=0;o<n.length;){var r=n[o++],i=n[o++];e.o(t,r)?0===i&&o++:0===i?Object.defineProperty(t,r,{enumerable:!0,value:n[o++]}):Object.defineProperty(t,r,{enumerable:!0,get:i})}else for(var r in n)e.o(n,r)&&!e.o(t,r)&&Object.defineProperty(t,r,{enumerable:!0,get:n[r]})},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r:e=>{Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})}};let t={};function n(e){return"object"==typeof e&&null!==e&&e.nodeType===Node.ELEMENT_NODE}e.r(t),e.d(t,{_readium_cssSelectorGenerator:()=>re,default:()=>ie,getCssSelector:()=>oe});const o={NONE:"",DESCENDANT:" ",CHILD:" > "},r={id:"id",class:"class",tag:"tag",attribute:"attribute",nthchild:"nthchild",nthoftype:"nthoftype"},i="_readium_cssSelectorGenerator";function s(e="unknown problem",...t){console.warn(`${i}: ${e}`,...t)}const c={selectors:[r.id,r.class,r.tag,r.attribute],includeTag:!1,whitelist:[],blacklist:[],combineWithinSelector:!0,combineBetweenSelectors:!0,root:null,maxCombinations:Number.POSITIVE_INFINITY,maxCandidates:Number.POSITIVE_INFINITY,useScope:!1,ignoreGeneratedClassNames:!1};function l(e){return!!e}function u(e){return e instanceof RegExp}function a(e){return["string","function"].includes(typeof e)||u(e)}function f(e){return Array.isArray(e)?e.filter(a):[]}function d(e){const t=[Node.DOCUMENT_NODE,Node.DOCUMENT_FRAGMENT_NODE,Node.ELEMENT_NODE];return function(e){return null!=e&&"object"==typeof e&&"nodeType"in e&&"number"==typeof e.nodeType}(e)&&t.includes(e.nodeType)}function p(e,t){if(d(e))return e.contains(t)||s("element root mismatch","Provided root does not contain the element. This will most likely result in producing a fallback selector using element\'s real root node. If you plan to use the selector using provided root (e.g. `root.querySelector`), it will not work as intended."),e;const n=t.getRootNode({composed:!1});return d(n)?(n.nodeType!==Node.DOCUMENT_NODE&&s("shadow root inferred","You did not provide a root and the element is a child of Shadow DOM. This will produce a selector using ShadowRoot as a root. If you plan to use the selector using document as a root (e.g. `document.querySelector`), it will not work as intended."),n):S(t)}function m(e){return"number"==typeof e?e:Number.POSITIVE_INFINITY}function g(e=[]){const[t=[],...n]=e;return 0===n.length?t:n.reduce((e,t)=>{const n=new Set(t);return e.filter(e=>n.has(e))},t)}function h(e){const t=e.map(e=>{if(u(e))return t=>e.test(t);if("function"==typeof e)return t=>{const n=e(t);return"boolean"!=typeof n?(s("pattern matcher function invalid","Provided pattern matching function does not return boolean. It\'s result will be ignored.",e),!1):n};if("string"==typeof e){const t=new RegExp("^"+e.replace(/[|\\\\{}()[\\]^$+?.]/g,"\\\\$&").replace(/\\*/g,".+")+"$");return e=>t.test(e)}return s("pattern matcher invalid","Pattern matching only accepts strings, regular expressions and/or functions. This item is invalid and will be ignored.",e),()=>!1});return e=>t.some(t=>t(e))}function y(e,t,n){const o=p(n,e[0]).querySelectorAll(t);if(o.length!==e.length)return!1;const r=new Set(o);return e.every(e=>r.has(e))}function b(e,t){t=null!=t?t:S(e);const o=[];let r=e;for(;r&&r!==t;)n(r)&&o.push(r),r=r.parentNode;return o}function N(e,t){return g(e.map(e=>b(e,t)))}function S(e){return e.ownerDocument.querySelector(":root")}const v=new RegExp(["^$","\\\\s"].join("|")),O=new RegExp(["^$"].join("|")),w=[r.nthoftype,r.tag,r.id,r.class,r.attribute,r.nthchild],E=h(["class","id","ng-*"]);function x({name:e}){return`[${e}]`}function T({name:e,value:t}){return`[${e}=\'${t}\']`}function j({nodeName:e,nodeValue:t}){return{name:B(e),value:B(null!=t?t:void 0)}}function C(e,t){const n=Array.from(e.attributes).filter(t=>function({nodeName:e,nodeValue:t},n){const o=n.tagName.toLowerCase();return!(["input","option"].includes(o)&&"value"===e||"src"===e&&(null==t?void 0:t.startsWith("data:"))||E(e))}(t,e)).map(j);return[...n.map(x),...n.map(T)]}const I=/^[a-z_-]{3,}$/i,A=/[bcdfghjklmnpqrstvwxyz]{4,}/i;function R(e,t){var n;const o=(null!==(n=e.getAttribute("class"))&&void 0!==n?n:"").trim().split(/\\s+/).filter(e=>!O.test(e));let r=o;if(null==t?void 0:t.ignoreGeneratedClassNames){const e=h(t.whitelist);r=o.filter(t=>{const n=`.${B(t)}`;return!!e(n)||function(e){if(!I.test(e))return!1;if(e.includes("_")&&!e.includes("__"))return!1;if(/^(css|sc|jsx|emotion|makeStyles|MuiButton|MuiBox)-/i.test(e))return!1;const t=e.split(/--|__|[-]|(?<=[a-z])(?=[A-Z])/).filter(e=>e.length>0);if(0===t.length)return!1;if(1===t.length&&t[0].length<4)return!1;for(const e of t){if(e.length<=2)return!1;if(A.test(e))return!1}return!0}(t)})}return r.map(e=>`.${B(e)}`)}function _(e,t){var n;const o=null!==(n=e.getAttribute("id"))&&void 0!==n?n:"",r=`#${B(o)}`,i=e.getRootNode({composed:!1});return!v.test(o)&&y([e],r,i)?[r]:[]}function $(e,t){const n=e.parentNode,o=n&&"children"in n?n.children:null;if(o)for(let t=0;t<o.length;t++)if(o[t]===e)return[`:nth-child(${String(t+1)})`];return[]}function D(e,t){return[B(e.tagName.toLowerCase())]}function P(e,t){const n=[...new Set((o=e.map(e=>D(e)),[].concat(...o)))];var o;return 0===n.length||n.length>1?[]:[n[0]]}function M(e,t){const n=P([e])[0],o=e.parentNode,r=o&&"children"in o?o:null;if(r){const t=Array.from(r.children).filter(e=>e.tagName.toLowerCase()===n),o=t.indexOf(e);if(o>-1)return[`${n}:nth-of-type(${String(o+1)})`]}return[]}function*k(e=[],{maxResults:t=Number.POSITIVE_INFINITY}={}){let n=0,o=L(1);for(;o.length<=e.length&&n<t;){n+=1;const t=new Array(o.length);for(let n=0;n<o.length;n++)t[n]=e[o[n]];yield t,o=G(o,e.length-1)}}function G(e=[],t=0){const n=e.length;if(0===n)return e;let o=n-1;for(;o>=0&&e[o]===t-(n-1-o);)o-=1;if(o<0)return L(n+1);e[o]+=1;for(let t=o+1;t<n;t++)e[t]=e[t-1]+1;return e}function L(e=1){const t=new Array(e);for(let n=0;n<e;n++)t[n]=n;return t}const F=":".charCodeAt(0).toString(16).toUpperCase(),V=/[ !"#$%&\'()[\\]{|}<>*+,./;=?@^`~\\\\]/;function B(e=""){return CSS?CSS.escape(e):function(e=""){return e.split("").map(e=>":"===e?`\\\\${F} `:V.test(e)?`\\\\${e}`:escape(e).replace(/%/g,"\\\\")).join("")}(e)}const Y={tag:P,id:function(e,t){return 0===e.length||e.length>1?[]:_(e[0])},class:function(e,t){return g(e.map(e=>R(e,t)))},attribute:function(e,t){return g(e.map(e=>C(e)))},nthchild:function(e,t){return g(e.map(e=>$(e)))},nthoftype:function(e,t){return g(e.map(e=>M(e)))}},q={tag:D,id:_,class:R,attribute:C,nthchild:$,nthoftype:M};function U(){const e=new Map;let t;return(n,o)=>{if(1!==n.length)return null!=t?t:t=W(n,o);const[r]=n;let i=e.get(r);return i||(i=W(n,o),e.set(r,i)),i}}function W(e,t){const{blacklist:n,whitelist:o,combineWithinSelector:r,maxCombinations:i}=t,s=h(n),c=h(o);return function(e){const{selectors:t,includeTag:n}=e,o=[...t];return n&&!o.includes("tag")&&o.push("tag"),o}(t).reduce((n,o)=>{const l=function(e,t,n){return(0,Y[t])(e,n)}(e,o,t),u=function(e=[],t,n){return e.filter(e=>n(e)||!t(e))}(l,s,c),a=function(e=[],t){return e.sort((e,n)=>{const o=t(e),r=t(n);return o&&!r?-1:!o&&r?1:0})}(u,c);return n[o]=r?Array.from(k(a,{maxResults:i})):a.map(e=>[e]),n},{})}function H(e){return e.includes(r.tag)||e.includes(r.nthoftype)?[...e]:[...e,r.tag]}function*z(e,t){const n={};for(const o of e){const e=t[o];e&&e.length>0&&(n[o]=e)}for(const e of function*(e={}){const t=Object.entries(e);if(0===t.length)return;const n=[{index:t.length-1,partial:{}}];for(;n.length>0;){const e=n.pop();if(!e)break;const{index:o,partial:r}=e;if(o<0){yield r;continue}const[i,s]=t[o];for(let e=s.length-1;e>=0;e--)n.push({index:o-1,partial:Object.assign(Object.assign({},r),{[i]:s[e]})})}}(n))yield Z(e)}function Z(e={}){const t=[...w];return e[r.tag]&&e[r.nthoftype]&&t.splice(t.indexOf(r.tag),1),t.map(t=>{return(o=e)[n=t]?o[n].join(""):"";var n,o}).join("")}function J(e,t){return[...e.map(e=>t+o.DESCENDANT+e),...e.map(e=>t+o.CHILD+e)]}function*K(e,t,n="",o,r=U()){const i=function*(e,t,n=U()){const o=new Set,r=n(e,t);for(const e of function*(e,t){for(const n of function(e){const{selectors:t,combineBetweenSelectors:n,includeTag:o,maxCandidates:r}=e,i=n?function(e=[],{maxResults:t=Number.POSITIVE_INFINITY}={}){return Array.from(k(e,{maxResults:t}))}(t,{maxResults:r}):t.map(e=>[e]);return o?i.map(H):i}(t))yield*z(n,e)}(r,t))o.has(e)||(o.add(e),yield e)}(e,o,r);for(const o of function*(e,t){if(""===t)yield*e;else for(const n of e)yield*J([n],t)}(i,n))y(e,o,t)&&(yield o)}function*Q(e,t,n="",o,r=U()){if(0===e.length)return null;const i=[e.length>1?e:[],...N(e,t).map(e=>[e])];for(const e of i)for(const i of K(e,t,n,o,r))yield{foundElements:e,selector:i}}function X(e){return{value:e,include:!1}}function ee({selectors:e,operator:t}){let n=[...w];e[r.tag]&&e[r.nthoftype]&&(n=n.filter(e=>e!==r.tag));let o="";return n.forEach(t=>{var n;(null!==(n=e[t])&&void 0!==n?n:[]).forEach(({value:e,include:t})=>{t&&(o+=e)})}),t+o}function te(e,t){const n=b(e,t).reverse(),i="object"==typeof(s=t)&&null!==s&&"nodeType"in s&&s.nodeType===Node.DOCUMENT_FRAGMENT_NODE&&"host"in s;var s;const c=n.map((e,t)=>{var n;const s=function(e,t,n=o.NONE){const r={};return t.forEach(t=>{Reflect.set(r,t,function(e,t){return q[t](e,void 0)}(e,t).map(X))}),{element:e,operator:n,selectors:r}}(e,[r.nthchild],i&&0===t?o.NONE:o.CHILD);return(null!==(n=s.selectors.nthchild)&&void 0!==n?n:[]).forEach(e=>{e.include=!0}),s});return[i?"":t?":scope":":root",...c.map(ee)].join("")}var ne=function(e,t){var n={};for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&t.indexOf(o)<0&&(n[o]=e[o]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var r=0;for(o=Object.getOwnPropertySymbols(e);r<o.length;r++)t.indexOf(o[r])<0&&Object.prototype.propertyIsEnumerable.call(e,o[r])&&(n[o[r]]=e[o[r]])}return n};function oe(e,t={}){return re(e,Object.assign(Object.assign({},t),{maxResults:1})).next().value}function*re(e,t={}){var o;const i=function(e){(e instanceof NodeList||e instanceof HTMLCollection)&&(e=Array.from(e));const t=(Array.isArray(e)?e:[e]).filter(n);return[...new Set(t)]}(e),s=function(e,t={}){const n=Object.assign(Object.assign({},c),t);return{selectors:(o=n.selectors,Array.isArray(o)?o.filter(e=>{return t=r,n=e,Object.values(t).includes(n);var t,n}):[]),whitelist:f(n.whitelist),blacklist:f(n.blacklist),root:p(n.root,e),combineWithinSelector:l(n.combineWithinSelector),combineBetweenSelectors:l(n.combineBetweenSelectors),includeTag:l(n.includeTag),maxCombinations:m(n.maxCombinations),maxCandidates:m(n.maxCandidates),useScope:l(n.useScope),maxResults:m(n.maxResults),ignoreGeneratedClassNames:l(n.ignoreGeneratedClassNames)};var o}(i[0],t),u=null!==(o=s.root)&&void 0!==o?o:S(i[0]);let a=0;for(const e of function*({elements:e,root:t,rootSelector:n="",options:o}){let r=t,i=n,s=!0;const c=U();for(;s;){let n=!1;for(const s of Q(e,r,i,o,c)){const{foundElements:o,selector:c}=s;if(n=!0,!y(e,c,t)){r=o[0],i=c;break}yield c}n||(s=!1)}}({elements:i,options:s,root:u,rootSelector:""}))if(yield e,a++,a>=s.maxResults)return;if(i.length>1){const{maxResults:e}=t,n=ne(t,["maxResults"]);if(yield i.map(e=>oe(e,n)).join(", "),a++,a>=s.maxResults)return}const d=void 0!==t.root;yield function(e,t){return e.map(e=>te(e,t)).join(", ")}(i,s.useScope||d?u:void 0)}const ie=oe;return t})());',Uo=`(function() {
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
`,Wo=class{constructor(e){if(this.detectedTools=new Set,!e.onDetected)throw Error(`onDetected callback is required`);this.options=e,this.setupDetection()}isAutomationToolPresent(){let e=window;return e.domAutomation||e.domAutomationController?`Selenium`:navigator.webdriver===!0?`Puppeteer/Playwright`:e.__webdriver_evaluate||e.__selenium_evaluate?`Chrome Automation`:e.callPhantom||e._phantom?`PhantomJS`:e.__nightmare?`Nightmare`:e.$testCafe?`TestCafe`:null}setupDetection(){let e=this.isAutomationToolPresent();e?this.handleDetected(e):(this.observer=new MutationObserver(()=>{let e=this.isAutomationToolPresent();e&&!this.detectedTools.has(e)&&this.handleDetected(e)}),this.observer.observe(document.documentElement,{childList:!0,subtree:!0,attributes:!0}),window.addEventListener(`unload`,()=>this.destroy()))}handleDetected(e){this.detectedTools.add(e),this.options.onDetected?.(e)}destroy(){this.observer?.disconnect(),this.observer=void 0,this.detectedTools.clear()}},Go=0;function Ko(){return++Go}var qo=`
onmessage = function(event) {
  var action = event.data;
  var startTime = performance.now()

  console[action.type](...action.payload);
  postMessage({
    id: action.id,
    time: performance.now() - startTime
  })
}
`,Jo=class{constructor(e,t){this.callbacks=new Map,this.worker=e,this.blobUrl=t,this.worker.onmessage=e=>{let t=e.data,n=t.id,r=this.callbacks.get(t.id);r&&(r({time:t.time}),this.callbacks.delete(n))},this.log=(...e)=>this.send(`log`,...e),this.table=(...e)=>this.send(`table`,...e),this.clear=(...e)=>this.send(`clear`,...e)}async send(e,...t){let n=Ko();return new Promise((r,i)=>{this.callbacks.set(n,r),this.worker.postMessage({id:n,type:e,payload:t}),setTimeout(()=>{i(Error(`timeout`)),this.callbacks.delete(n)},2e3)})}destroy(){this.worker.terminate(),URL.revokeObjectURL(this.blobUrl)}};Jo.workerScript=qo;var Yo=Jo;function Xo(e){return typeof window<`u`&&console?console[e]:(...e)=>{}}var Zo=Xo(`log`),Qo=Xo(`table`),$o=Xo(`clear`);async function es(){if(typeof navigator<`u`&&navigator.brave&&navigator.brave.isBrave)try{return await Promise.race([navigator.brave.isBrave(),new Promise(e=>setTimeout(()=>e(!1),1e3))])}catch{return!0}return!1}function ts(e){return!e.excludes.some(e=>e())&&e.includes.some(e=>e())}var ns=class{constructor(e={}){if(this.isOpen=!1,this.checkCount=0,this.maxChecks=10,this.maxPrintTime=0,this.largeObjectArray=null,this.options={onDetected:e.onDetected||(()=>{}),onClosed:e.onClosed||(()=>{}),interval:e.interval||1e3,enableDebuggerDetection:e.enableDebuggerDetection||!1},!E.UA.Firefox)try{let e=new Blob([Yo.workerScript],{type:`application/javascript`}),t=URL.createObjectURL(e),n=new Worker(t);this.workerConsole=new Yo(n,t)}catch(e){console.warn(`Failed to create Web Worker for DevTools detection:`,e)}this.startDetection()}createLargeObjectArray(){let e={};for(let t=0;t<500;t++)e[`${t}`]=`${t}`;let t=[];for(let n=0;n<50;n++)t.push(e);return t}getLargeObjectArray(){return this.largeObjectArray===null&&(this.largeObjectArray=this.createLargeObjectArray()),this.largeObjectArray}async calcTablePrintTime(){let e=this.getLargeObjectArray();if(this.workerConsole)try{return(await this.workerConsole.table(e)).time}catch{let t=performance.now();return Qo(e),performance.now()-t}{let t=performance.now();return Qo(e),performance.now()-t}}async calcLogPrintTime(){let e=this.getLargeObjectArray();if(this.workerConsole)return(await this.workerConsole.log(e)).time;{let t=performance.now();return Zo(e),performance.now()-t}}isPerformanceDetectionEnabled(){return ts({includes:[()=>!!E.UA.Chrome,()=>!!E.UA.Chromium,()=>!!E.UA.Safari,()=>!!E.UA.Firefox],excludes:[]})}isDebuggerDetectionEnabled(){return this.options.enableDebuggerDetection}async checkPerformanceBased(){if(!this.isPerformanceDetectionEnabled())return!1;let e=await this.calcTablePrintTime(),t=Math.max(await this.calcLogPrintTime(),await this.calcLogPrintTime());return this.maxPrintTime=Math.max(this.maxPrintTime,t),this.workerConsole?await this.workerConsole.clear():$o(),e===0?!1:this.maxPrintTime===0?!!await es():e>this.maxPrintTime*10}async checkDebuggerBased(){if(!this.isDebuggerDetectionEnabled()||await es())return!1;let e=performance.now();try{(()=>{}).constructor(`debugger`)()}catch{}return performance.now()-e>100}async detectDevTools(){return await this.checkPerformanceBased()?!0:this.options.enableDebuggerDetection&&this.checkCount>=this.maxChecks?await this.checkDebuggerBased():!1}startDetection(){this.intervalId=window.setInterval(async()=>{this.checkCount++;let e=await this.detectDevTools();e!==this.isOpen&&(this.isOpen=e,e?this.options.onDetected():this.options.onClosed()),this.checkCount>this.maxChecks*2&&(this.checkCount=0)},this.options.interval),window.addEventListener(`beforeunload`,()=>this.destroy())}isDevToolsOpen(){return this.isOpen}async checkNow(){let e=this.isOpen;return this.isOpen=await this.detectDevTools(),this.isOpen!==e&&(this.isOpen?this.options.onDetected():this.options.onClosed()),this.isOpen}destroy(){this.intervalId&&(clearInterval(this.intervalId),this.intervalId=void 0),this.workerConsole&&(this.workerConsole.destroy(),this.workerConsole=void 0),this.isOpen=!1,this.checkCount=0}},rs=class{constructor(e){if(this.detected=!1,!e.onDetected)throw Error(`onDetected callback is required`);this.options=e,this.setupDetection()}isIframed(){try{return window.self===window.top?{isEmbedded:!1,isCrossOrigin:!1}:{isEmbedded:!0,isCrossOrigin:!window.top.location.href}}catch{return{isEmbedded:!0,isCrossOrigin:!0}}}setupDetection(){let{isEmbedded:e,isCrossOrigin:t}=this.isIframed();e?this.handleDetected(t):(this.observer=new MutationObserver(()=>{let{isEmbedded:e,isCrossOrigin:t}=this.isIframed();e&&!this.detected&&(this.handleDetected(t),this.observer?.disconnect())}),this.observer.observe(document.documentElement,{childList:!0,subtree:!0,attributes:!0}),window.addEventListener(`unload`,()=>this.destroy()))}handleDetected(e){this.detected=!0,this.options.onDetected?.(e)}destroy(){this.observer?.disconnect(),this.observer=void 0,this.detected=!1}},is=class{constructor(e={}){this.styleElement=null,this.beforePrintHandler=null,this.onPrintAttempt=e.onPrintAttempt,e.disable&&this.setupPrintProtection(e.watermark)}setupPrintProtection(e){let t=document.createElement(`style`);t.textContent=`
            @media print {
                body * {
                    display: none !important;
                }
                body::after {
                    content: "${e||`Printing has been disabled`}";
                    font-size: 200%;
                    display: block;
                    text-align: center;
                    margin-top: 50vh;
                    transform: translateY(-50%);
                }
            }
        `,document.head.appendChild(t),this.styleElement=t,this.beforePrintHandler=e=>(e.preventDefault(),this.onPrintAttempt?.(),!1),window.addEventListener(`beforeprint`,this.beforePrintHandler)}destroy(){this.beforePrintHandler&&(window.removeEventListener(`beforeprint`,this.beforePrintHandler),this.beforePrintHandler=null),this.styleElement?.parentNode&&(this.styleElement.parentNode.removeChild(this.styleElement),this.styleElement=null)}},as=class{constructor(e={}){this.onContextMenuBlocked=e.onContextMenuBlocked,this.contextMenuHandler=this.handleContextMenu.bind(this),document.addEventListener(`contextmenu`,this.contextMenuHandler,!0),window.addEventListener(`unload`,()=>this.destroy())}handleContextMenu(e){e.preventDefault(),e.stopPropagation();let t={type:`context_menu`,timestamp:Date.now(),clientX:e.clientX,clientY:e.clientY,targetFrameSrc:``};return this.onContextMenuBlocked&&this.onContextMenuBlocked(t),!1}destroy(){this.contextMenuHandler&&(document.removeEventListener(`contextmenu`,this.contextMenuHandler,!0),this.contextMenuHandler=void 0)}},os=`readium:navigator:suspiciousActivity`,ss=class{dispatchSuspiciousActivity(e,t){let n=new CustomEvent(os,{detail:{type:e,timestamp:Date.now(),...t}});window.dispatchEvent(n)}constructor(e={}){e.monitorDevTools&&(this.devToolsDetector=new ns({onDetected:()=>{this.dispatchSuspiciousActivity(`developer_tools`,{targetFrameSrc:``,key:``,code:``,keyCode:-1,ctrlKey:!1,altKey:!1,shiftKey:!1,metaKey:!1})}})),e.checkAutomation&&(this.automationDetector=new Wo({onDetected:e=>{this.dispatchSuspiciousActivity(`automation_detected`,{tool:e})}})),e.checkIFrameEmbedding&&(this.iframeEmbeddingDetector=new rs({onDetected:e=>{this.dispatchSuspiciousActivity(`iframe_embedding_detected`,{isCrossOrigin:e})}})),e.protectPrinting?.disable&&(this.printProtector=new is({...e.protectPrinting,onPrintAttempt:()=>{this.dispatchSuspiciousActivity(`print`,{})}})),e.disableContextMenu&&(this.contextMenuProtector=new as({onContextMenuBlocked:e=>{this.dispatchSuspiciousActivity(`context_menu`,e)}}))}destroy(){this.automationDetector?.destroy(),this.devToolsDetector?.destroy(),this.iframeEmbeddingDetector?.destroy(),this.printProtector?.destroy(),this.contextMenuProtector?.destroy()}},cs=`readium:navigator:keyboardPeripheral`,ls=class{constructor(e={}){this.keyManager=new ra,this.pagehideHandler=e=>{e.persisted||this.destroy()},this.dispatcher=e=>{let t=new CustomEvent(cs,{detail:e});window.dispatchEvent(t)},this.conditionBridge=new oo(e.keyboardPeripherals||[],e=>this.setupKeyboardPeripherals(e)),this.conditionBridge.setup(),window.addEventListener(`pagehide`,this.pagehideHandler)}setupKeyboardPeripherals(e){this.removeKeydownHandler(),e.length!==0&&(this.keydownHandler=this.keyManager.createUnifiedHandler(``,e,this.dispatcher),document.addEventListener(`keydown`,this.keydownHandler,!0))}removeKeydownHandler(){this.keydownHandler&&(document.removeEventListener(`keydown`,this.keydownHandler,!0),this.keydownHandler=void 0)}destroy(){this.conditionBridge.destroy(),this.removeKeydownHandler(),window.removeEventListener(`pagehide`,this.pagehideHandler)}},us=e=>e.split(/[?#]/)[0],ds=e=>{let t=us(e);if(t.endsWith(`/`))return t;try{let e=new URL(t);return e.pathname=e.pathname.substring(0,e.pathname.lastIndexOf(`/`)+1),e.href}catch{return t.replace(/[^/]*$/,``)}},fs=(e,t=`always`,n)=>{let r=t===`always`||t!==`never`&&typeof n==`string`&&n.startsWith(`https:`),i=e.join(` `);return[...r?[`upgrade-insecure-requests`]:[],`default-src ${i} blob:`,`connect-src 'none'`,`script-src ${i} blob: 'unsafe-inline'`,`style-src ${i} blob: 'unsafe-inline'`,`img-src ${i} blob: data:`,`font-src ${i} blob: data:`,`object-src ${i} blob:`,`child-src ${i}`,`form-action 'none'`].join(`; `)},ps=class{constructor(e,t,n,r){this.pub=e,this.baseURL=t,this.item=n,this.injector=null,this.item=n,this.cssProperties=r.cssProperties,this.injector=r.injector??null,this.upgradeInsecureRequests=r.upgradeInsecureRequests??`always`}reset(){this.currentUrl&&URL.revokeObjectURL(this.currentUrl),this.currentUrl=void 0,this.currentResource?.close(),this.currentResource=void 0,this.pendingBuild=void 0}async build(e=!1){if(this.currentUrl)return this.currentUrl;if(this.pendingBuild)return this.pendingBuild;let t=this.doBuild(e).finally(()=>{this.pendingBuild===t&&(this.pendingBuild=void 0)});return this.pendingBuild=t,t}async doBuild(e){this.currentResource=this.pub.get(this.item);let t=await this.currentResource.link();if(!this.currentResource)return`about:blank`;if(t.mediaType.isHTML){let t=await this.buildHtmlFrame(e);return this.currentUrl=t,t}if(t.mediaType.isBitmap||t.mediaType.equals(k.SVG)){let e=await this.buildImageFrame();return this.currentUrl=e,e}throw Error(`Unsupported frame mediatype `+t.mediaType.string)}async buildHtmlFrame(e=!1){if(!this.currentResource)throw Error(`No resource loaded`);let t=await this.currentResource.link(),n=await this.currentResource.readAsXML();if(!n)throw Error(`Failed reading item ${t.href}`);let r=n.querySelector(`parsererror`);if(r){let e=r.querySelector(`div`);throw Error(`Failed parsing item ${t.href}: ${e?.textContent||r.textContent}`)}return this.injector&&await this.injector.injectForDocument(n,t),this.finalizeDOM(n,this.pub.baseURL,t.toURL(this.baseURL)||``,t.mediaType,e,this.cssProperties,this.upgradeInsecureRequests)}async buildImageFrame(){if(!this.currentResource)throw Error(`No resource loaded`);let e=await this.currentResource.link(),t=e.toURL(this.baseURL)||``,n=document.implementation.createHTMLDocument(e.title||e.href);if((e?.height||0)>0&&(e?.width||0)>0){let t=n.createElement(`meta`);t.name=`viewport`,t.content=`width=${e.width}, height=${e.height}`,t.dataset.readium=`true`,n.head.appendChild(t)}let r=document.createElement(`img`);r.src=t||``,r.alt=e.title||``,await r.decode(),n.body.appendChild(r),this.injector&&await this.injector.injectForDocument(n,new N({href:`readium-image-frame.xhtml`,type:k.XHTML.string}));let i=n.createElement(`style`);return i.dataset.readium=`true`,i.textContent=`
        html, body { width: 100%; height: 100%; margin: 0; padding: 0; font-size: 0; }
        img { margin: 0; padding: 0; border: 0; }`,n.head.appendChild(i),this.finalizeDOM(n,this.pub.baseURL,t,e.mediaType,!0,void 0,this.upgradeInsecureRequests)}async buildBlankFrame(e,t){let n=document.implementation.createHTMLDocument(this.item.title||this.item.href),r=n.createElement(`meta`);return r.name=`viewport`,r.content=`width=${e}, height=${t}`,r.dataset.readium=`true`,n.head.appendChild(r),this.injector&&await this.injector.injectForDocument(n,this.item.mediaType.isHTML?this.item:new N({href:`readium-image-frame.xhtml`,type:k.XHTML.string})),this.reset(),this.currentUrl=this.finalizeDOM(n,this.pub.baseURL,this.item.toURL(this.baseURL)||``,k.XHTML,!0,void 0,this.upgradeInsecureRequests),this.currentUrl}setProperties(e,t){for(let n in e){let r=e[n];r&&t.documentElement.style.setProperty(n,r)}}finalizeDOM(e,t,n,r,i=!1,a,o=`always`){if(!e)return``;let s=(this.injector?.getAllowedDomains?.()||[]).map(us),c=t?ds(t):void 0,l=[...new Set([...c?[c]:[],...s])].filter(Boolean);if(a&&!i&&this.setProperties(a,e),e.body.querySelectorAll(`img`).forEach(e=>{e.setAttribute(`fetchpriority`,`high`),e.setAttribute(`referrerpolicy`,`origin`)}),r.isHTML&&this.pub.metadata.languages?.[0]){let t=this.pub.metadata.languages[0];if(r===k.XHTML){let n=e.documentElement.lang||e.documentElement.getAttribute(`xml:lang`),r=e.body.lang||e.body.getAttribute(`xml:lang`);r&&!n?(e.documentElement.lang=r,e.documentElement.setAttribute(`xml:lang`,r),e.body.removeAttribute(`xml:lang`),e.body.removeAttribute(`lang`)):n||(e.documentElement.lang=t,e.documentElement.setAttribute(`xml:lang`,t))}else r===k.HTML&&!e.documentElement.lang&&(e.documentElement.lang=t)}if(po(this.pub.metadata)===`rtl`&&!e.documentElement.dir&&!e.body.dir&&(e.documentElement.dir=R.rtl),n!==void 0){let t=e.createElement(`base`);t.href=n,t.dataset.readium=`true`,e.head.prepend(t)}let u=e.createElement(`meta`);return u.httpEquiv=`Content-Security-Policy`,u.content=fs(l,o,t),u.dataset.readium=`true`,e.head.prepend(u),URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(e)],{type:r.isHTML?r.string:`application/xhtml+xml`}))}},ms=class{constructor(e,t={},n=[],r=[],i=[]){this.timelineFragmentIds=r,this.hidden=!0,this.destroyed=!1,this.pendingUnwatchSelectors=[],this.currModules=[],this.serialize=so(),this.frame=document.createElement(`iframe`),this.frame.sandbox.value=`allow-same-origin allow-scripts`,this.frame.classList.add(`readium-navigator-iframe`),this.frame.style.visibility=`hidden`,this.frame.ariaHidden=`true`,this.frame.style.opacity=`0`,this.frame.style.position=`absolute`,this.frame.style.pointerEvents=`none`,this.frame.style.transition=`visibility 0s, opacity 0.1s linear`,this.source=e,this.contentProtectionConfig={...t},this.keyboardPeripheralsConfig=[...n],this.resizeWatchSelectors=[...i]}async load(e){return this.serialize(()=>new Promise((t,n)=>{if(this.loader){let n=this.frame.contentWindow;if([...this.currModules].sort().join(`|`)===[...e].sort().join(`|`)){try{t(n)}catch{}return}this.comms?.halt(),this.loader.destroy(),this.loader=new Wa(n,e),this.currModules=e,this.comms=void 0,this.conditionBridge?.destroy();try{t(n)}catch{}}else this.frame.onload=()=>{let n=this.frame.contentWindow;this.loader=new Wa(n,e),this.currModules=e;try{t(n)}catch{}},this.frame.onerror=e=>{try{n(e)}catch{}},this.frame.contentWindow.location.replace(this.source)}))}applyContentProtection(){this.comms||this.comms.resume(),this.comms.send(`peripherals_protection`,this.contentProtectionConfig),this.keyboardPeripheralsConfig&&this.keyboardPeripheralsConfig.length>0&&(this.conditionBridge?.destroy(),this.conditionBridge=new oo(this.keyboardPeripheralsConfig,e=>{e.length>0&&this.comms.send(`keyboard_peripherals`,e)}),this.conditionBridge.setup()),this.contentProtectionConfig.monitorScrollingExperimental&&this.comms.send(`scroll_protection`,{}),this.contentProtectionConfig.protectPrinting?.disable&&this.comms.send(`print_protection`,this.contentProtectionConfig.protectPrinting),this.resizeWatchSelectors.forEach(e=>{this.comms.send(`decoration_resize`,{action:`watch`,selector:e})}),this.pendingUnwatchSelectors.forEach(e=>{this.comms.send(`decoration_resize`,{action:`unwatch`,selector:e})}),this.pendingUnwatchSelectors=[]}addResizeTarget(e){this.resizeWatchSelectors.includes(e)||this.resizeWatchSelectors.push(e),this.pendingUnwatchSelectors=this.pendingUnwatchSelectors.filter(t=>t!==e),this.comms?.ready&&this.comms.send(`decoration_resize`,{action:`watch`,selector:e})}removeResizeTarget(e){this.resizeWatchSelectors=this.resizeWatchSelectors.filter(t=>t!==e),this.comms?.ready?this.comms.send(`decoration_resize`,{action:`unwatch`,selector:e}):this.pendingUnwatchSelectors.includes(e)||this.pendingUnwatchSelectors.push(e)}async destroy(){return this.serialize(async()=>{this.conditionBridge?.destroy(),await this.hideNow(),this.loader?.destroy(),this.frame.remove(),this.destroyed=!0})}async hide(){return this.serialize(()=>this.hideNow())}async hideNow(){if(!this.destroyed){if(this.frame.style.visibility=`hidden`,this.frame.ariaHidden=`true`,this.frame.style.opacity=`0`,this.frame.style.pointerEvents=`none`,this.hidden=!0,this.frame.blur(),this.frame.parentElement)return this.comms===void 0||!this.comms.ready?void 0:new Promise((e,t)=>{this.comms?.send(`unfocus`,void 0,t=>{this.comms?.halt(),e()})});this.comms?.halt()}}async show(e){return this.serialize(()=>this.showNow(e))}async showNow(e){if(this.destroyed)throw Error(`Trying to show frame when it doesn't exist`);if(!this.frame.parentElement)throw Error(`Trying to show frame that is not attached to the DOM`);return this.comms?this.comms.resume():this.comms=new ao(this.frame.contentWindow,this.source),new Promise((t,n)=>{this.comms?.send(`activate`,void 0,()=>{this.comms?.send(`focus`,void 0,()=>{this.applyContentProtection(),this.timelineFragmentIds.length>0&&this.comms?.send(`timeline_entries`,this.timelineFragmentIds);let n=()=>{this.frame.style.removeProperty(`visibility`),this.frame.style.removeProperty(`opacity`),this.frame.style.removeProperty(`pointer-events`),this.frame.ariaHidden=null,this.hidden=!1,E.UA.WebKit&&this.comms?.send(`force_webkit_recalc`,void 0),t()};e===void 0?n():this.comms?.send(`go_progression`,e,n)})})})}setCSSProperties(e){this.destroyed||!this.frame.contentWindow||(this.hidden&&!this.comms&&(this.comms=new ao(this.frame.contentWindow,this.source),this.comms.halt()),this.comms?.send(`update_properties`,e))}get iframe(){if(this.destroyed)throw Error(`Trying to use frame when it doesn't exist`);return this.frame}get realSize(){if(this.destroyed)throw Error(`Trying to use frame client rect when it doesn't exist`);return this.frame.getBoundingClientRect()}get isDestroyed(){return this.destroyed}get window(){if(this.destroyed||!this.frame.contentWindow)throw Error(`Trying to use frame window when it doesn't exist`);return this.frame.contentWindow}get atLeft(){return this.window.scrollX<5}get atRight(){return this.window.scrollX>this.window.document.scrollingElement.scrollWidth-this.window.innerWidth-5}get msg(){return this.comms}get ldr(){return this.loader}},hs=10,gs=5,_s=class{constructor(e,t,n,r,i,a,o,s=[],c){this.pool=new Map,this.blobs=new Map,this.inprogress=new Map,this.pendingUpdates=new Map,this.injector=null,this.updateSequence=0,this.container=e,this.positions=t,this.currentCssProperties=n,this.injector=r??null,this.contentProtectionConfig=i||{},this.keyboardPeripheralsConfig=a||[],this.getFragmentIds=o??(()=>[]),this.resizeWatchSelectors=[...s],this.upgradeInsecureRequests=c??`always`}addResizeTarget(e){this.resizeWatchSelectors.includes(e)||this.resizeWatchSelectors.push(e),this.pool.forEach(t=>t.addResizeTarget(e))}removeResizeTarget(e){this.resizeWatchSelectors=this.resizeWatchSelectors.filter(t=>t!==e),this.pool.forEach(t=>t.removeResizeTarget(e))}async destroy(){let e=this.inprogress.values(),t=e.next(),n=[];for(;t.value;)n.push(t.value),t=e.next();n.length>0&&await Promise.allSettled(n),this.inprogress.clear();let r=this.pool.values(),i=r.next();for(;i.value;)await i.value.destroy(),i=r.next();this.pool.clear(),this.blobs.forEach(e=>e.reset()),this.blobs.clear(),this.injector?.dispose(),this.container.childNodes.forEach(e=>{(e.nodeType===Node.ELEMENT_NODE||e.nodeType===Node.TEXT_NODE)&&e.remove()})}async update(e,t,n,r=!1){for(;this.forcedUpdate;)await this.forcedUpdate;let i=++this.updateSequence,a=this.positions.findIndex(e=>e.locations.position===t.locations.position);if(a<0)throw Error(`Locator not found in position list: ${t.locations.position} > ${this.positions.reduce((e,t)=>t.locations.position||0>e?t.locations.position||0:e,0)}`);let o=this.positions[a].href;this.inprogress.has(o)&&await this.inprogress.get(o);let s=new Promise(async(s,c)=>{let l=[],u=[];this.positions.forEach((e,t)=>{(t>a+hs||t<a-hs)&&(l.includes(e.href)||l.push(e.href)),t<a+gs&&t>a-gs&&(u.includes(e.href)||u.push(e.href))}),l.forEach(async e=>{u.includes(e)||this.pool.has(e)&&(await this.pool.get(e)?.destroy(),this.pool.delete(e),this.pendingUpdates.has(e)&&this.pendingUpdates.set(e,{inPool:!1}))}),this.currentBaseURL!==void 0&&e.baseURL!==this.currentBaseURL&&(this.blobs.forEach(e=>e.reset()),this.blobs.clear()),this.currentBaseURL=e.baseURL,r&&(this.blobs.forEach(e=>e.reset()),this.blobs.clear(),this.pendingUpdates.clear());let d=async t=>{if(this.pendingUpdates.has(t)&&this.pendingUpdates.get(t)?.inPool===!1){let e=this.blobs.get(t);e&&(e.reset(),this.blobs.delete(t),this.pendingUpdates.delete(t))}if(this.pool.has(t)){let e=this.pool.get(t);if(!this.blobs.has(t))await e.destroy(),this.pool.delete(t),this.pendingUpdates.delete(t);else{await e.load(n);return}}let r=e.readingOrder.findWithHref(t);if(!r)return;this.blobs.has(t)||this.blobs.set(t,new ps(e,this.currentBaseURL||``,r,{cssProperties:this.currentCssProperties,injector:this.injector,upgradeInsecureRequests:this.upgradeInsecureRequests}));let i=new ms(await this.blobs.get(t).build(),this.contentProtectionConfig,this.keyboardPeripheralsConfig,this.getFragmentIds(t),this.resizeWatchSelectors);return t!==o&&await i.hide(),this.container.appendChild(i.iframe),await i.load(n),this.pool.set(t,i),i};try{await Promise.all(u.filter(e=>e===o).map(e=>d(e)))}catch(e){c(e);return}if(i!==this.updateSequence){s();return}Promise.all(u.filter(e=>e!==o&&!this.inprogress.has(e)).map(async e=>{let t=d(e);this.inprogress.set(e,t);try{await t}finally{this.inprogress.get(e)===t&&this.inprogress.delete(e)}})).catch(e=>console.warn(`Failed preloading frame`,e));let f=this.pool.get(o);if(!f)s();else{if(f?.source!==this._currentFrame?.source||r){if(await this._currentFrame?.hide(),i!==this.updateSequence){s();return}let e=this.pool.get(o);if(!e||(await e.load(n),i!==this.updateSequence)){s();return}let r=this.pool.get(o);if(!r){s();return}if(await r.show(t.locations.progression),this._currentFrame=r,f){let e=this.container.ownerDocument.activeElement;e&&e.tagName===`IFRAME`&&e!==f.iframe&&f.iframe.focus({preventScroll:!0})}}s()}});if(this.inprogress.set(o,s),r){let e=s.catch(()=>{});this.forcedUpdate=e,e.then(()=>{this.forcedUpdate===e&&(this.forcedUpdate=void 0)})}try{await s}finally{this.inprogress.delete(o)}}setCSSProperties(e){if(!((e,t)=>{let n=Object.keys(e),r=Object.keys(t);if(n.length!==r.length)return!1;for(let r of n)if(e[r]!==t[r])return!1;return!0})(this.currentCssProperties||{},e)){this.currentCssProperties=e,this.pool.forEach(t=>{t.setCSSProperties(e)});for(let e of this.blobs.keys())this.pendingUpdates.set(e,{inPool:this.pool.has(e)})}}get currentFrames(){return[this._currentFrame]}_frameFor(e){return this.pool.get(e)}get currentBounds(){let e={x:0,y:0,width:0,height:0,top:0,right:0,bottom:0,left:0,toJSON(){return this}};return this.currentFrames.forEach(t=>{if(!t)return;let n=t.realSize;e.x=Math.min(e.x,n.x),e.y=Math.min(e.y,n.y),e.width+=n.width,e.height=Math.max(e.height,n.height),e.top=Math.min(e.top,n.top),e.right=Math.min(e.right,n.right),e.bottom=Math.min(e.bottom,n.bottom),e.left=Math.min(e.left,n.left)}),e}},vs=(e=>(e[e.Left=0]=`Left`,e[e.Center=1]=`Center`,e[e.Right=2]=`Right`,e))(vs||{}),ys=(e=>(e[e.Top=0]=`Top`,e[e.Middle=1]=`Middle`,e[e.Bottom=2]=`Bottom`,e))(ys||{}),bs=class{constructor(){this.outerWidth=0,this.outerHeight=0,this.HTML=document.documentElement,this.Head=document.head,this.Body=document.body}refreshOuterPixels(e){E.OS.iOS||(this.outerHeight=window.outerHeight-window.innerHeight,E.OS.Android&&E.UA.Chrome&&window.screen.height>window.innerHeight&&(this.outerHeight=(window.screen.height-window.innerHeight)/1.5),this.outerWidth=window.outerWidth-window.innerWidth)}getBibiEventCoord(e,t=0){let n={X:0,Y:0};return/^touch/.test(e.type)?(n.X=e.touches[t].screenX,n.Y=e.touches[t].screenY):(n.X=e.screenX,n.Y=e.screenY),(e.target.ownerDocument?.documentElement||e.target.documentElement)===this.HTML&&(n.X-=this.HTML.scrollLeft+this.Body.scrollLeft,n.Y-=this.HTML.scrollTop+this.Body.scrollTop),n.X-=this.outerWidth,n.Y-=this.outerHeight,n}getTouchDistance(e){if(e.touches.length!==2)return 0;let t=e.touches[0].screenX-this.outerWidth,n=e.touches[0].screenY-this.outerHeight,r=e.touches[1].screenX-this.outerWidth,i=e.touches[1].screenY-this.outerHeight;return Math.sqrt((r-t)**2+(i-n)**2)}getTouchCenter(e){if(e.touches.length!==2)return null;let t=this.HTML.scrollLeft+this.Body.scrollLeft,n=this.HTML.scrollTop+this.Body.scrollTop,r=e.touches[0].screenX-this.outerWidth-t,i=e.touches[0].screenY-this.outerHeight-n,a=e.touches[1].screenX-this.outerWidth-t,o=e.touches[1].screenY-this.outerHeight-n;return{X:(r+a)/2,Y:(i+o)/2}}getBibiEvent(e){if(!e)return{Coord:null,Division:null,Ratio:null,Target:null};let t=this.getBibiEventCoord(e),n={X:t.X/window.innerWidth,Y:t.Y/window.innerHeight},r,i,a,o;a=r=.3,o=i=.7;let s={X:null,Y:null};return s.X=n.X<a?0:o<n.X?2:1,s.Y=n.Y<r?0:i<n.Y?2:1,{Target:e.target,Coord:t,Ratio:n,Division:s}}},xs=class{constructor(){this._DOM={show:!1,pinchTarget:document.createElement(`div`),touch1:document.createElement(`div`),touch2:document.createElement(`div`),center:document.createElement(`div`),stats:document.createElement(`div`)},this._DOM.show=!0,this._DOM.pinchTarget.style.zIndex=this._DOM.stats.style.zIndex=this._DOM.center.style.zIndex=this._DOM.touch1.style.zIndex=this._DOM.touch2.style.zIndex=`100000`,this._DOM.pinchTarget.style.position=this._DOM.stats.style.position=this._DOM.center.style.position=this._DOM.touch1.style.position=this._DOM.touch2.style.position=`absolute`,this._DOM.pinchTarget.style.borderRadius=this._DOM.center.style.borderRadius=this._DOM.touch1.style.borderRadius=this._DOM.touch2.style.borderRadius=`50%`,this._DOM.pinchTarget.style.pointerEvents=this._DOM.stats.style.pointerEvents=this._DOM.center.style.pointerEvents=this._DOM.touch1.style.pointerEvents=this._DOM.touch2.style.pointerEvents=`none`,this._DOM.pinchTarget.style.display=this._DOM.center.style.display=this._DOM.touch1.style.display=this._DOM.touch2.style.display=`none`,this._DOM.pinchTarget.style.paddingTop=this._DOM.center.style.paddingTop=`10px`,this._DOM.pinchTarget.style.width=this._DOM.pinchTarget.style.height=this._DOM.center.style.width=this._DOM.center.style.height=`10px`,this._DOM.pinchTarget.style.backgroundColor=`green`,this._DOM.center.style.backgroundColor=`red`,this._DOM.touch1.style.backgroundColor=this._DOM.touch2.style.backgroundColor=`blue`,this._DOM.touch1.style.height=this._DOM.touch2.style.height=`20px`,this._DOM.touch1.style.width=this._DOM.touch2.style.width=`20px`,this._DOM.touch1.style.paddingTop=this._DOM.touch2.style.paddingTop=`20px`,this._DOM.touch1.textContent=`1`,this._DOM.touch2.textContent=`2`,this._DOM.stats.style.padding=`20px`,this._DOM.stats.style.backgroundColor=`rgba(0,0,0,0.5)`,this._DOM.stats.style.color=`white`,this._DOM.stats.textContent=`[stats]`,document.body.appendChild(this._DOM.stats),document.body.appendChild(this._DOM.center),document.body.appendChild(this._DOM.touch1),document.body.appendChild(this._DOM.touch2),document.body.appendChild(this._DOM.pinchTarget)}get show(){return this.DOM.show}get DOM(){return this._DOM}},Ss=6,Cs=1.02,ws=50,Q=()=>typeof window.CSSTransformValue<`u`,Ts=class{constructor(e,t=!1){this.dragState=0,this.minimumMoved=!1,this.pan={startX:0,endX:0,startY:0,overscrollX:0,overscrollY:0,letItGo:!1,preventClick:!1,translateX:0,translateY:0,touchID:0},this.pinch={startDistance:0,startScale:0,target:{X:0,Y:0},touchN:0,startTranslate:{X:0,Y:0}},this._scale=1,this.scaleDebouncer=0,this.frameBounds=null,this.debugger=null,this.btouchstartHandler=this.touchstartHandler.bind(this),this.btouchendHandler=this.touchendHandler.bind(this),this.btouchmoveHandler=this.touchmoveHandler.bind(this),this.bdblclickHandler=this.dblclickHandler.bind(this),this.bmousedownHandler=this.mousedownHandler.bind(this),this.bmouseupHandler=this.mouseupHandler.bind(this),this.bmousemoveHandler=this.mousemoveHandler.bind(this),this.moveFrame=0,this.dragTranslate=null,this.dragTransform=null,this.manager=e,this.coordinator=new bs,this.attachEvents(),t&&(this.debugger=new xs)}get scale(){return this._scale}set scale(e){isNaN(e)&&(e=1),window.clearTimeout(this.scaleDebouncer),this.scaleDebouncer=window.setTimeout(()=>{this.dragState===0&&this.scale<Cs&&(this.pan.translateX=0,this.pan.translateY=0,this.clearPan(),this.manager.updateBookStyle()),this.manager.listener(`zoom`,e)},100),this._scale=e}attachEvents(){this.observe(this.manager.spineElement),this.pan={startX:0,startY:0,endX:0,overscrollX:0,overscrollY:0,letItGo:!1,preventClick:!1,translateX:0,translateY:0,touchID:0},this.pinch={startDistance:0,startScale:0,target:{X:0,Y:0},startTranslate:{X:0,Y:0},touchN:0}}clearPan(){this.pan.letItGo=!1,this.pan.touchID=0,this.pan.endX=0,this.pan.overscrollX=0,this.pan.overscrollY=0}clearPinch(){this.pinch={startDistance:0,startScale:this.pinch.startScale,target:{X:0,Y:0},touchN:0,startTranslate:{X:0,Y:0}}}observe(e){e.addEventListener(`touchstart`,this.btouchstartHandler),e.addEventListener(`touchend`,this.btouchendHandler),e.addEventListener(`touchmove`,this.btouchmoveHandler,{passive:!0}),e.addEventListener(`dblclick`,this.bdblclickHandler,{passive:!0}),e.addEventListener(`mousedown`,this.bmousedownHandler),e.addEventListener(`mouseup`,this.bmouseupHandler),e.addEventListener(`mousemove`,this.bmousemoveHandler)}clickHandler(e){}touchstartHandler(e){if([`TEXTAREA`,`OPTION`,`INPUT`,`SELECT`].indexOf(e.target.nodeName)!==-1)return;switch(e.stopPropagation(),this.frameBounds=this.manager.currentBounds,this.coordinator.refreshOuterPixels(this.frameBounds),e.touches.length){case 3:return;case 2:{e.preventDefault(),this.pinch.startDistance=this.coordinator.getTouchDistance(e);let t=this.startTouch(e);this.pan.startX=t.X,this.pan.startY=t.Y,this.dragState=2,this.manager.updateBookStyle(!0),this.isScaled?(this.pinch.target.X-=this.pan.translateX*(this.pinch.startScale/this.scale),this.pinch.target.Y-=this.pan.translateY*(this.pinch.startScale/this.scale),this.pinch.target={X:0,Y:0},this.pinch.startScale=1/this.scale):(this.pinch.target={X:0,Y:0},this.pinch.startScale=this.scale),this.pinch.startTranslate={X:this.pan.translateX,Y:this.pan.translateY},this.debugger?.show&&(this.debugger.DOM.touch2.style.display=``,this.debugger.DOM.center.style.display=``,this.debugger.DOM.pinchTarget.style.display=``);return}case 1:this.pan.touchID=e.touches[0].identifier,this.debugger?.show&&(this.debugger.DOM.touch1.style.display=``);default:this.dragState<1&&(this.dragState=1),this.manager.updateBookStyle(!0)}this.manager.updateSpineStyle(!1);let t=this.startTouch(e);this.pan.startX=t.X,this.pan.startY=t.Y}startTouch(e){let t=this.coordinator.getTouchCenter(e)||this.coordinator.getBibiEventCoord(e);return{X:t.X-this.manager.width/2-this.pan.translateX*this.scale+this.manager.width/2,Y:t.Y-this.manager.height/2-this.pan.translateY*this.scale+this.manager.height/2}}touchendHandler(e){if(e.stopPropagation(),!e.touches||e.touches.length===0)this.pan.endX&&!this.isScaled?(this.pinch.touchN&&(this.pan.endX=this.pan.startX),this.updateAfterDrag()):!this.pinch.touchN&&Math.abs(this.pan.overscrollX)>ws&&Math.abs(this.pan.overscrollY)<ws/2&&(this.pan.startX=0,this.pan.endX=-this.pan.overscrollX,this.updateAfterDrag()),this.dragState=0,this.minimumMoved=!1,this.clearPinch(),this.debugger?.show&&(this.debugger.DOM.center.style.display=`none`,this.debugger.DOM.touch1.style.display=`none`,this.debugger.DOM.touch2.style.display=`none`);else if(e.touches.length===1){this.dragState=1,e.touches[0].identifier!==this.pan.touchID&&(this.pan.touchID=e.touches[0].identifier),this.debugger?.show&&(this.debugger.DOM.center.style.display=`none`,this.debugger.DOM.touch2.style.display=`none`,this.debugger.DOM.pinchTarget.style.display=`none`);let t=this.startTouch(e);this.pan.startX=t.X,this.pan.startY=t.Y}window.setTimeout(()=>{this.manager.updateBookStyle(!0),this.dragState===0&&(this.scale<Cs&&(this.pan.translateX=0,this.pan.translateY=0),this.clearPan()),this.manager.updateBookStyle(!0)},50)}touchmoveHandler(e){e.stopPropagation();let t=this.coordinator.getBibiEventCoord(e);Math.abs(this.pan.startY-t.Y)+Math.abs(this.pan.startX-t.X)>5&&(this.minimumMoved||(this.manager.deselect(),this.minimumMoved=!0),this.dragState<1&&(this.dragState=1));let n=this.coordinator?.getTouchDistance(e),r=!1,i=this.scale;if(this.dragState===2&&n){if(this.pinch.touchN++,this.pinch.touchN<4)return;let e=n/this.pinch.startDistance*this.scale;e>=Ss&&(e=Ss),e<=Cs&&(e=1),this.scale=e,this.pinch.startDistance=n,r=!0}if(this.pan.letItGo===!1&&(this.pan.letItGo=Math.abs(this.pan.startY-t.Y)<Math.abs(this.pan.startX-t.X)),this.debugger?.show&&(this.debugger.DOM.touch1.style.top=`${t.Y-10}px`,this.debugger.DOM.touch1.style.left=`${t.X-10}px`,this.debugger.DOM.touch1.innerText=`${t.X.toFixed(2)},${t.Y.toFixed(2)}`),this.dragState>0&&this.isScaled||this.dragState>1){if(this.dragState===1){let e={X:t.X-this.manager.width/2,Y:t.Y-this.manager.height/2};this.pan.translateX=(e.X-(this.pan.startX-this.manager.width/2))*1/this.scale,this.pan.translateY=(e.Y-(this.pan.startY-this.manager.height/2))*1/this.scale}else if(this.dragState===2){let t=this.coordinator.getTouchCenter(e);if(this.debugger?.show){this.debugger.DOM.center.style.top=`${t.Y-5}px`,this.debugger.DOM.center.style.left=`${t.X-5}px`,this.debugger.DOM.center.innerText=`${t.X.toFixed(2)},${t.Y.toFixed(2)}`;let n=this.coordinator.getBibiEventCoord(e,1);this.debugger.DOM.touch2.style.top=`${n.Y-10}px`,this.debugger.DOM.touch2.style.left=`${n.X-10}px`,this.debugger.DOM.touch2.innerText=`${n.X.toFixed(2)},${n.Y.toFixed(2)}`}t.X-=this.manager.width/2,t.Y-=this.manager.height/2;let n=-t.X/i;n+=t.X/this.scale,this.pinch.target.X+=n,t.X+=this.pinch.target.X*this.scale/this.pinch.startScale;let r=-t.Y/i;r+=t.Y/this.scale,this.pinch.target.Y+=r,t.Y+=this.pinch.target.Y*this.scale/this.pinch.startScale;let a=(t.X-(this.pan.startX-this.manager.width/2))*1/this.scale,o=(t.Y-(this.pan.startY-this.manager.height/2))*1/this.scale;this.pan.translateX=a,this.pan.translateY=o,this.debugger?.show&&(this.debugger.DOM.pinchTarget.style.left=`${this.pinch.target.X*this.scale/this.pinch.startScale-5+this.manager.width/2}px`,this.debugger.DOM.pinchTarget.style.top=`${this.pinch.target.Y*this.scale/this.pinch.startScale-5+this.manager.height/2}px`,this.debugger.DOM.pinchTarget.innerText=`${(this.pinch.target.X*this.scale/this.pinch.startScale).toFixed(2)},${(this.pinch.target.Y*this.scale/this.pinch.startScale).toFixed(2)}`)}let n=this.frameBounds.width/6,a=this.frameBounds.height/6;this.pan.translateX<-n&&(this.pan.overscrollX=-(n+this.pan.translateX),this.pan.translateX=-n),this.pan.translateY<-a&&(this.pan.overscrollY=-(a+this.pan.translateY),this.pan.translateY=-a),this.pan.translateX>n&&(this.pan.overscrollX=n-this.pan.translateX,this.pan.translateX=n),this.pan.translateY>a&&(this.pan.overscrollY=a-this.pan.translateY,this.pan.translateY=a),r=!0,this.debugger?.show&&(this.debugger.DOM.stats.innerText=`TX: ${this.pan.translateX.toFixed(2)}
TY: ${this.pan.translateY.toFixed(2)}
Zoom: ${this.scale.toFixed(2)}
Overscroll: ${this.pan.overscrollX.toFixed(2)},${this.pan.overscrollY.toFixed(2)}`)}if(r)this.manager.updateBookStyle();else if(this.dragState>0&&this.pan.letItGo){this.pan.endX=t.X;let e=this.manager.currentSlide*(this.manager.width/this.manager.perPage),n=this.pan.endX-this.pan.startX,r=this.manager.rtl?e+n:e-n,i=window.devicePixelRatio||1,a=Math.round((this.manager.rtl?1:-1)*r*i)/i;cancelAnimationFrame(this.moveFrame),this.moveFrame=requestAnimationFrame(()=>{requestAnimationFrame(()=>{Q()?(this.dragTransform||(this.dragTranslate=new CSSTranslate(CSS.px(0),CSS.px(0),CSS.px(0)),this.dragTransform=new CSSTransformValue([this.dragTranslate])),this.dragTranslate.x.value=a,this.manager.spineElement.attributeStyleMap.set(`transform`,this.dragTransform)):this.manager.spineElement.style.transform=`translate3d(${a}px, 0, 0)`})})}}dblclickHandler(e){clearTimeout(this.dtimer),this.pdblclick=!0,this.dtimer=window.setTimeout(()=>this.pdblclick=!1,200),!this.disableDblClick&&this.isScaled&&(this.scale=1)}get isScaled(){return this.scale>1}addTouch(e){e.touches=[{pageX:e.pageX,pageY:e.pageY}]}mousedownHandler(e){this.isScaled&&(this.addTouch(e),this.touchstartHandler(e))}mouseupHandler(e){this.isScaled&&this.touchendHandler(e)}mousemoveHandler(e){this.isScaled&&e.buttons>0&&(e.preventDefault(),this.addTouch(e),this.touchmoveHandler(e))}updateAfterDrag(){let e=(this.manager.rtl?-1:1)*(this.pan.endX-this.pan.startX),t=Math.abs(e);e>0&&t>this.manager.threshold&&this.manager.slength>this.manager.perPage?this.manager.listener(`no_less`,void 0):e<0&&t>this.manager.threshold&&this.manager.slength>this.manager.perPage&&this.manager.listener(`no_more`,void 0),this.manager.slideToCurrent(!0,!0)}},Es=class{constructor(e,t,n,r={},i=[],a=[]){this.frameIsAppended=!1,this.pendingUnwatchSelectors=[],this.currModules=[],this.viewportSize=void 0,this.serialize=so(),this.cachedPage=void 0,this.peripherals=e,this.debugHref=n,this.contentProtectionConfig={...r},this.keyboardPeripheralsConfig=[...i],this.resizeWatchSelectors=[...a],this.frame=document.createElement(`iframe`),this.frame.sandbox.value=`allow-same-origin allow-scripts`,this.frame.classList.add(`readium-navigator-iframe`),this.frame.classList.add(`blank`),this.frame.scrolling=`no`,this.frame.style.visibility=`hidden`,this.frame.ariaHidden=`true`,this.frame.style.display=`none`,this.frame.style.position=`absolute`,this.frame.style.pointerEvents=`none`,this.frame.style.transformOrigin=`0 0`,this.frame.style.transform=`scale(1)`,this.frame.style.background=`#fff`,this.frame.style.touchAction=`none`,this.frame.dataset.originalHref=n,this.source=`about:blank`,this.wrapper=document.createElement(`div`),this.wrapper.style.position=`relative`,this.wrapper.style.contain=`strict`,this.wrapper.style.float=this.wrapper.style.cssFloat=t===R.rtl?`right`:`left`}async load(e,t){return this.serialize(()=>this.loadNow(e,t))}async loadNow(e,t){return this.frameIsAppended||(this.wrapper.appendChild(this.frame),this.frameIsAppended=!0),this.source===t&&this.loadPromise&&[...this.currModules].sort().join(`|`)===[...e].sort().join(`|`)||(this.loaded&&this.source!==t&&this.window.stop(),this.source=t,this.loadPromise=new Promise((t,n)=>{if(this.loader&&this.loaded){let n=this.frame.contentWindow;if([...this.currModules].sort().join(`|`)===[...e].sort().join(`|`)){try{t(n),this.loadPromise=void 0}catch{}return}this.comms?.halt(),this.loader.destroy(),this.loader=new Wa(n,e),this.currModules=e,this.comms=void 0,this.conditionBridge?.destroy();try{t(n),this.loadPromise=void 0}catch{}}else this.frame.addEventListener(`load`,()=>{let n=this.frame.contentWindow;this.loader=new Wa(n,e),this.currModules=e,this.peripherals.observe(this.wrapper),this.peripherals.observe(n);try{t(n)}catch{}},{once:!0}),this.frame.addEventListener(`error`,e=>{try{n(e.error),this.loadPromise=void 0}catch{}},{once:!0}),this.frame.style.removeProperty(`display`),this.frame.contentWindow.location.replace(this.source)})),this.loadPromise}loadPageSize(){if(this.viewportSize)return this.viewportSize;let e=this.frame.contentWindow,t=e.document.head.querySelector(`meta[name=viewport]`);if(t){let e=/(\w+) *= *([^\s,]+)/g,n,r=0,i=0;for(;n=e.exec(t.content);)n[1]===`width`?r=Number.parseFloat(n[2]):n[1]===`height`&&(i=Number.parseFloat(n[2]));if(r>0&&i>0)return this.viewportSize={width:r,height:i},this.viewportSize}return{width:e.document.body.scrollWidth,height:e.document.body.scrollHeight}}update(e){if(!this.loaded)return;let t=this.loadPageSize(),n=Math.min(this.wrapper.clientWidth/t.width,this.wrapper.clientHeight/t.height);Q()?(this.frame.attributeStyleMap.set(`width`,CSS.px(t.width)),this.frame.attributeStyleMap.set(`height`,CSS.px(t.height)),this.frame.attributeStyleMap.set(`transform`,new CSSTransformValue([new CSSScale(n,n)]))):(this.frame.style.height=`${t.height}px`,this.frame.style.width=`${t.width}px`,this.frame.style.transform=`scale(${n})`);let r=this.frame.getBoundingClientRect(),i=this.wrapper.clientHeight-r.height;if(Q()){if(this.frame.attributeStyleMap.set(`top`,CSS.px(i/2)),e===A.left){let e=this.wrapper.clientWidth-r.width;this.frame.attributeStyleMap.set(`left`,CSS.px(e))}else if(e===A.center){let e=this.wrapper.clientWidth-r.width;this.frame.attributeStyleMap.set(`left`,CSS.px(e/2))}else this.frame.attributeStyleMap.set(`left`,CSS.px(0))}else if(this.frame.style.top=`${i/2}px`,e===A.left){let e=this.wrapper.clientWidth-r.width;this.frame.style.left=`${e}px`}else if(e===A.center){let e=this.wrapper.clientWidth-r.width;this.frame.style.left=`${e/2}px`}else this.frame.style.left=`0px`;this.frame.style.removeProperty(`visibility`),this.frame.ariaHidden=null,this.frame.style.removeProperty(`pointer-events`),this.frame.classList.remove(`blank`),this.frame.classList.add(`loaded`)}async destroy(){return this.serialize(async()=>{this.conditionBridge?.destroy(),await this.unfocusNow(),this.loader?.destroy(),this.wrapper.remove()})}async unload(){return this.serialize(()=>this.unloadNow())}async unloadNow(){if(this.loaded)return this.deselect(),this.frame.style.visibility=`hidden`,this.frame.ariaHidden=`true`,this.frame.style.pointerEvents=`none`,this.frame.classList.add(`blank`),this.frame.classList.remove(`loaded`),this.comms?.halt(),this.loader?.destroy(),this.comms=void 0,this.conditionBridge?.destroy(),this.frame.blur(),new Promise((e,t)=>{this.frame.addEventListener(`load`,()=>{try{this.showPromise=void 0,e()}catch{}},{once:!0}),this.frame.addEventListener(`error`,e=>{try{this.showPromise=void 0,t(e.error)}catch{}},{once:!0}),this.source=`about:blank`,this.frame.contentWindow.location.replace(`about:blank`),this.frame.style.display=`none`,this.frame.style.width=`0px`,this.frame.style.height=`0px`})}deselect(){this.frame.contentWindow?.getSelection()?.removeAllRanges()}async unfocus(){return this.serialize(()=>this.unfocusNow())}async unfocusNow(){if(this.frame.parentElement)return this.comms===void 0||!this.comms.ready?void 0:(this.frame.blur(),new Promise((e,t)=>{this.comms?.send(`unfocus`,void 0,t=>{this.comms?.halt(),this.showPromise=void 0,e()})}));this.comms?.halt()}applyContentProtection(){this.comms||this.comms.resume(),this.comms.send(`peripherals_protection`,this.contentProtectionConfig),this.keyboardPeripheralsConfig&&this.keyboardPeripheralsConfig.length>0&&(this.conditionBridge?.destroy(),this.conditionBridge=new oo(this.keyboardPeripheralsConfig,e=>{e.length>0&&this.comms.send(`keyboard_peripherals`,e)}),this.conditionBridge.setup()),this.contentProtectionConfig.protectPrinting?.disable&&this.comms.send(`print_protection`,this.contentProtectionConfig.protectPrinting),this.resizeWatchSelectors.forEach(e=>{this.comms.send(`decoration_resize`,{action:`watch`,selector:e})}),this.pendingUnwatchSelectors.forEach(e=>{this.comms.send(`decoration_resize`,{action:`unwatch`,selector:e})}),this.pendingUnwatchSelectors=[]}addResizeTarget(e){this.resizeWatchSelectors.includes(e)||this.resizeWatchSelectors.push(e),this.pendingUnwatchSelectors=this.pendingUnwatchSelectors.filter(t=>t!==e),this.comms?.ready&&this.comms.send(`decoration_resize`,{action:`watch`,selector:e})}removeResizeTarget(e){this.resizeWatchSelectors=this.resizeWatchSelectors.filter(t=>t!==e),this.comms?.ready?this.comms.send(`decoration_resize`,{action:`unwatch`,selector:e}):this.pendingUnwatchSelectors.includes(e)||this.pendingUnwatchSelectors.push(e)}async show(e){return this.serialize(()=>this.showNow(e))}async showNow(e){if(!this.frame.parentElement)console.warn(`Trying to show frame that is not attached to the DOM`);else if(!this.loaded)this.showPromise=void 0;else return this.showPromise?(this.cachedPage!==e&&(this.update(e),this.cachedPage=e),this.showPromise):(this.cachedPage=e,this.comms?this.comms.resume():this.comms=new ao(this.frame.contentWindow,this.source),this.showPromise=new Promise((e,t)=>{this.comms.send(`focus`,void 0,t=>{this.update(this.cachedPage),this.applyContentProtection(),e()})}),this.showPromise)}async activate(){return this.serialize(()=>new Promise((e,t)=>{if(!this.comms?.ready)return e();this.comms?.send(`activate`,void 0,()=>{e()})}))}get element(){return this.wrapper}get iframe(){return this.frame}get realSize(){return this.frame.getBoundingClientRect()}get loaded(){return this.frame.contentWindow&&this.frame.contentWindow.location.href!==`about:blank`}set width(e){if(Q()){let t=this.wrapper.attributeStyleMap.get(`width`);if(t instanceof CSSUnitValue&&t.unit===`percent`&&t.value===e)return;this.wrapper.attributeStyleMap.set(`width`,CSS.percent(e))}else{let t=`${e}%`;if(this.wrapper.style.width===t)return;this.wrapper.style.width=t}}set height(e){if(Q()){let t=this.wrapper.attributeStyleMap.get(`height`);if(t instanceof CSSUnitValue&&t.unit===`px`&&t.value===e)return;this.wrapper.attributeStyleMap.set(`height`,CSS.px(e))}else{let t=`${e}px`;if(this.wrapper.style.height===t)return;this.wrapper.style.height=t}}get window(){if(!this.frame.contentWindow)throw Error(`Trying to use frame window when it doesn't exist`);return this.frame.contentWindow}get atLeft(){return this.window.scrollX<5}get atRight(){return this.window.scrollX>this.window.document.scrollingElement.scrollWidth-this.window.innerWidth-5}get msg(){return this.comms}get ldr(){return this.loader}},Ds=(e=>(e.auto=`auto`,e.landscape=`landscape`,e.portrait=`portrait`,e))(Ds||{}),Os=(e=>(e.auto=`auto`,e.both=`both`,e.none=`none`,e.landscape=`landscape`,e))(Os||{}),ks=class{constructor(e){this.shift=!0,this.spreads=[],this.nLandscape=0,this.index(e),this.testShift(e),console.log(`Indexed ${this.spreads.length} spreads for ${e.readingOrder.items.length} items`)}index(e,t=!1){this.nLandscape=0,e.readingOrder.items.forEach((n,r)=>{t||(e.readingOrder.items[r]=n.addProperties({number:r+1,isImage:n.type?.indexOf(`image/`)===0}));let i=n.properties?.otherProperties.orientation===`landscape`;(!n.properties?.page||t)&&(n.properties=n.properties?.add({page:i?`center`:(+!this.shift+r-this.nLandscape)%2?e.metadata.readingProgression===R.rtl?`right`:`left`:e.metadata.readingProgression===R.rtl?`left`:`right`})),(i||n.properties?.otherProperties.addBlank)&&this.nLandscape++}),t&&(this.spreads=[]),this.buildSpreads(e.readingOrder)}testShift(e){let t=!1;this.spreads.forEach((e,n)=>{if(e.length>1)return;let r=e[0],i=r.properties?.otherProperties.orientation;n===0&&(i===`landscape`||i!==`portrait`&&((r.width||0)>(r.height||0)||r.properties?.otherProperties.spread===`both`))&&(this.shift=!1),t&&r.properties?.page===A.center&&this.spreads[n-1][0].addProperties({addBlank:!0}),t=i===`portrait`&&r.properties?.page!==`center`&&r.properties?.otherProperties.number>1}),this.shift||this.index(e,!0)}buildSpreads(e){let t=[];e.items.forEach((e,n)=>{!n&&this.shift?this.spreads.push([e]):e.properties?.page===A.center?(t.length>0&&this.spreads.push(t),this.spreads.push([e]),t=[]):t.length>=2?(this.spreads.push(t),t=[e]):t.push(e)}),t.length>0&&this.spreads.push(t)}currentSpread(e,t){return this.spreads[Math.min(Math.floor(e/t),this.spreads.length-1)]}findByLink(e){return this.spreads.find(t=>t.includes(e))||void 0}},As=8,js=5,Ms=300,Ns=15e3,Ps=250,Fs=150,Is=500,Ls=class{constructor(e,t,n,r,i,a,o,s=[],c){if(this.pool=new Map,this.blobs=new Map,this.inprogress=new Map,this.delayedShow=new Map,this.delayedTimeout=new Map,this.previousFrames=[],this.injector=null,this.width=0,this.height=0,this.currentSlide=0,this.spread=!0,this.orientationInternal=-1,this.bookScale=null,this.bookTranslate=null,this.bookTransform=null,this.container=e,this.positions=t,this.pub=n,this.injector=i??null,this.contentProtectionConfig=a||{},this.keyboardPeripheralsConfig=o||[],this.resizeWatchSelectors=[...s],this.upgradeInsecureRequests=c??`always`,this.spreadPresentation=n.metadata.otherMetadata?.spread||Os.auto,this.pub.metadata.effectiveReadingProgression!==R.rtl&&this.pub.metadata.effectiveReadingProgression!==R.ltr)throw Error(`Unsupported reading progression for fixed-layout EPUB`);this.spreader=new ks(this.pub),this.containerHeightCached=e.clientHeight,this.bookElement=document.createElement(`div`),this.bookElement.ariaLabel=`Book`,this.bookElement.tabIndex=-1,this.updateBookStyle(!0),this.spineElement=document.createElement(`div`),this.spineElement.ariaLabel=`Spine`,this.bookElement.appendChild(this.spineElement),this.container.appendChild(this.bookElement),this.updateSpineStyle(!0),this.peripherals=new Ts(this);let l=document.createDocumentFragment();this.pub.readingOrder.items.forEach(e=>{let t=new Es(this.peripherals,this.pub.metadata.effectiveReadingProgression,e.href,this.contentProtectionConfig,this.keyboardPeripheralsConfig,this.resizeWatchSelectors);this.pool.set(e.href,t),t.width=100/this.length*(e.properties?.otherProperties.orientation===Ds.landscape||e.properties?.otherProperties.addBlank?this.perPage:1),t.height=this.height,l.appendChild(t.wrapper)}),this.spineElement.appendChild(l)}set listener(e){this._listener=e}get listener(){return this._listener}get doNotDisturb(){return this.peripherals.pan.touchID>0}resizeHandler(e=!0,t=!0){this.currentSlide+this.perPage>this.length&&(this.currentSlide=this.length<=this.perPage?0:this.length-1),this.containerHeightCached=this.container.clientHeight,this.orientationInternal=-1,this.updateSpineStyle(!0),e&&(this.currentSlide=this.reAlign(),this.slideToCurrent(!t,t)),clearTimeout(this.resizeTimeout),this.resizeTimeout=window.setTimeout(()=>{let e=100/this.length,t=new Map(this.pub.readingOrder.items.map(e=>[e.href,e]));this.pool.forEach((n,r)=>{let i=t.get(r);i&&requestAnimationFrame(()=>{if(n.width=e*(i.properties?.otherProperties.orientation===Ds.landscape||i.properties?.otherProperties.addBlank?this.perPage:1),n.height=this.height,!n.loaded)return;let t=this.spreader.findByLink(i);n.update(this.spreadPosition(t,i))})})},Ps)}updateDimensions(){this.width=this.bookElement.clientWidth,this.height=this.bookElement.clientHeight}get rtl(){return this.pub.metadata.effectiveReadingProgression===R.rtl}get single(){return!this.spread||this.portrait}get perPage(){return this.spread&&!this.portrait?2:1}get threshold(){return 50}get portrait(){return this.spreadPresentation===Os.none||(this.orientationInternal===-1&&(this.orientationInternal=+(this.containerHeightCached>this.container.clientWidth)),this.orientationInternal===1)}updateSpineStyle(e,t=!0){let n=0;if(this.updateDimensions(),this.perPage>1&&(n=this.width/2),Q())this.spineElement.attributeStyleMap.set(`transition`,new CSSUnparsedValue([e?`all ${t?Fs:Is}ms ease-out`:`all 0ms ease-out`])),this.spineElement.attributeStyleMap.set(`margin-right`,CSS.px(this.rtl?n:0)),this.spineElement.attributeStyleMap.set(`margin-left`,CSS.px(this.rtl?0:n)),this.spineElement.attributeStyleMap.set(`width`,CSS.px(this.width/this.perPage*this.length)),this.transform?this.spineElement.attributeStyleMap.set(`transform`,new CSSTransformValue([new CSSTranslate(CSS.px(this.transform||0),CSS.px(0),CSS.px(0))])):this.spineElement.attributeStyleMap.delete(`transform`),this.spineElement.attributeStyleMap.set(`contain`,new CSSUnparsedValue([`content`]));else{let r={transition:e?`all ${t?Fs:Is}ms ease-out`:`all 0ms ease-out`,marginRight:this.rtl?`${n}px`:`0`,marginLeft:this.rtl?`0`:`${n}px`,width:`${this.width/this.perPage*this.length}px`,transform:this.transform?`translate3d(${this.transform}px, 0px, 0px)`:``,contain:`content`};Object.assign(this.spineElement.style,r)}}updateBookStyle(e=!1){if(e){let e={overflow:`hidden`,direction:this.pub.metadata.effectiveReadingProgression,cursor:``,height:`100%`,width:`100%`,position:`relative`,outline:`none`,transition:this.peripherals?.dragState?`none`:`transform .15s ease-in-out`,touchAction:`none`};Object.assign(this.bookElement.style,e)}let t=this.peripherals?.scale||1,n=this.peripherals?.pan.translateX||0,r=this.peripherals?.pan.translateY||0;Q()?(this.bookTransform||(this.bookScale=new CSSScale(1,1),this.bookTranslate=new CSSTranslate(CSS.px(0),CSS.px(0),CSS.px(0)),this.bookTransform=new CSSTransformValue([this.bookScale,this.bookTranslate])),this.bookScale.x.value=t,this.bookScale.y.value=t,this.bookTranslate.x.value=n,this.bookTranslate.y.value=r,this.bookElement.attributeStyleMap.set(`transform`,this.bookTransform)):this.bookElement.style.transform=`scale(${t}) translate3d(${n}px, ${r}px, 0px)`}goTo(e){if(this.slength<=this.perPage)return;e=this.reAlign(e);let t=this.currentSlide;this.currentSlide=Math.min(Math.max(e,0),this.length-1),t!==this.currentSlide&&this.slideToCurrent(!1)}onChange(){this.peripherals.scale=1,this.updateBookStyle()}get offset(){return(this.rtl?1:-1)*this.currentSlide*(this.width/this.perPage)}get length(){if(this.single)return this.slength;let e=this.slength+this.nLandscape;return this.shift&&e%2==0?e+1:e}get slength(){return this.pub.readingOrder.items.length||0}get shift(){return this.spreader.shift}get nLandscape(){return this.spreader.nLandscape}setPerPage(e){this.spread=e===null||e!==1,requestAnimationFrame(()=>this.resizeHandler(!0))}slideToCurrent(e,t=!0){this.updateDimensions(),e?requestAnimationFrame(()=>{requestAnimationFrame(()=>{this.transform=this.offset,this.updateSpineStyle(!0,t),this.deselect()})}):(this.transform=this.offset,this.updateSpineStyle(!1),this.deselect())}bounce(e=!1){requestAnimationFrame(()=>{this.transform=this.offset+50*(e?1:-1),this.updateSpineStyle(!0,!0),setTimeout(()=>{this.transform=this.offset,this.updateSpineStyle(!0,!0)},100)})}next(e=1){if(this.slength<=this.perPage)return!1;let t=this.currentSlide;return this.currentSlide=Math.min(this.currentSlide+e,this.length-1),this.perPage>1&&this.currentSlide%2&&this.currentSlide--,this.currentSlide===t&&(this.currentSlide+1,this.length),t===this.currentSlide?(this.bounce(this.rtl),!1):(this.slideToCurrent(!0),this.onChange(),!0)}prev(e=1){if(this.slength<=this.perPage)return!1;let t=this.currentSlide;return this.currentSlide=Math.max(this.currentSlide-e,0),this.perPage>1&&this.currentSlide%2&&this.currentSlide++,t===this.currentSlide?(this.bounce(!this.rtl),!1):(this.slideToCurrent(!0),this.onChange(),!0)}get ownerWindow(){return this.container.ownerDocument.defaultView||window}async destroy(){let e=this.inprogress.values(),t=e.next(),n=[];for(;t.value;)n.push(t.value),t=e.next();n.length>0&&await Promise.allSettled(n),this.inprogress.clear();let r=this.pool.values(),i=r.next();for(;i.value;)await i.value.destroy(),i=r.next();this.pool.clear(),this.blobs.forEach(e=>e.reset()),this.blobs.clear(),this.injector?.dispose(),this.container.childNodes.forEach(e=>{(e.nodeType===Node.ELEMENT_NODE||e.nodeType===Node.TEXT_NODE)&&e.remove()})}makeSpread(e){return this.perPage<2?[this.pub.readingOrder.items[e]]:this.spreader.currentSpread(e,this.perPage)}reAlign(e=this.currentSlide){return e%2&&!this.single&&e++,e}spreadPosition(e,t){return this.perPage<2||e.length<2?A.center:t.href===e[0].href?this.rtl?A.right:A.left:this.rtl?A.left:A.right}async waitForItem(e){if(this.inprogress.has(e)&&await this.inprogress.get(e),this.delayedShow.has(e)){let t=this.delayedTimeout.get(e);t>0?clearTimeout(t):await this.delayedShow.get(e),this.delayedTimeout.set(e,0),this.delayedShow.delete(e)}}async cancelShowing(e){if(this.delayedShow.has(e)){let t=this.delayedTimeout.get(e);t>0&&clearTimeout(t),this.delayedShow.delete(e)}}async update(e,t,n,r=!1){let i=this.pub.readingOrder.items.findIndex(e=>e.href===t.href);if(i<0)throw Error(`Href not found in reading order`);this.currentSlide!==i&&(this.currentSlide=this.reAlign(i),this.slideToCurrent(!0));let a=this.makeSpread(this.currentSlide);this.perPage>1&&i++;for(let e of a)await this.waitForItem(e.href);let o=new Promise(async(t,r)=>{let o=[],s=[];this.positions.forEach((e,t)=>{(t>i+As||t<i-As)&&(o.includes(e.href)||o.push(e.href)),t<i+js&&t>i-js&&(s.includes(e.href)||s.push(e.href))}),o.forEach(async e=>{s.includes(e)||this.pool.has(e)&&(this.cancelShowing(e),await this.pool.get(e)?.unload(),this.blobs.get(e)?.reset())}),this.currentBaseURL!==void 0&&e.baseURL!==this.currentBaseURL&&(this.blobs.forEach(e=>e.reset()),this.blobs.clear()),this.currentBaseURL=e.baseURL;let c=async t=>{let r=e.readingOrder.findIndexWithHref(t),i=e.readingOrder.items[r];if(i&&(this.blobs.has(t)||this.blobs.set(t,new ps(e,this.currentBaseURL||``,i,{injector:this.injector,upgradeInsecureRequests:this.upgradeInsecureRequests})),!this.delayedShow.has(t))){let e=new Promise((a,o)=>{let s=!1,c=window.setTimeout(async()=>{this.delayedTimeout.set(t,0);try{let e=this.makeSpread(this.reAlign(r)),a=this.spreadPosition(e,i),o=this.pool.get(t);await o.load(n,await this.blobs.get(t).build(!0)),this.peripherals.isScaled||await o.show(a)}catch(e){console.warn(`Failed preloading ${t}`,e)}this.delayedShow.delete(t),s=!0,a()},Ms);setTimeout(()=>{!s&&this.delayedShow.get(t)===e&&o(`Offscreen load timeout: ${t}`)},Ns),this.delayedTimeout.set(t,c)});this.delayedShow.set(t,e)}};try{await Promise.all(s.map(e=>c(e)))}catch(e){r(e);return}let l=[],u=[],d=[];for(let e of a){let t=this.pool.get(e.href),r=this.blobs.get(e.href);if(r){this.cancelShowing(e.href);try{await t.load(n,await r.build(!0)),await t.show(this.spreadPosition(a,e)),this.previousFrames.push(t),await t.activate(),l.push(t)}catch(t){console.warn(`Failed showing ${e.href}`,t),u.push(t),d.push(e)}}}if(l.length>0){let e=l[0].loadPageSize();for(let t of d){let r=this.pool.get(t.href),i=this.blobs.get(t.href);if(i)try{await r.load(n,await i.buildBlankFrame(e.width,e.height)),await r.show(this.spreadPosition(a,t)),this.previousFrames.push(r),await r.activate(),l.push(r)}catch(e){console.warn(`Failed showing a blank page for ${t.href}`,e)}}}else if(u.length>0){r(u[0]);return}for(;this.previousFrames.length>0;){let e=this.previousFrames.shift();e&&!l.includes(e)&&await e.unfocus()}this.previousFrames=l;let f=this.container.ownerDocument.activeElement;f&&f.tagName===`IFRAME`&&!l.some(e=>e.iframe===f)&&l[0]?.iframe.focus({preventScroll:!0}),t()});for(let e of a)this.inprogress.set(e.href,o);try{await o}finally{for(let e of a)this.inprogress.delete(e.href)}}addResizeTarget(e){this.resizeWatchSelectors.includes(e)||this.resizeWatchSelectors.push(e),this.pool.forEach(t=>t.addResizeTarget(e))}removeResizeTarget(e){this.resizeWatchSelectors=this.resizeWatchSelectors.filter(t=>t!==e),this.pool.forEach(t=>t.removeResizeTarget(e))}get currentFrames(){if(this.perPage<2){let e=this.pub.readingOrder.items[this.currentSlide];return[this.pool.get(e.href)]}return this.spreader.currentSpread(this.currentSlide,this.perPage).map(e=>this.pool.get(e.href))}get currentBounds(){let e={x:0,y:0,width:0,height:0,top:0,right:0,bottom:0,left:0,toJSON(){return this}};return this.currentFrames.forEach(t=>{if(!t)return;let n=t.realSize;e.x=Math.min(e.x,n.x),e.y=Math.min(e.y,n.y),e.width+=n.width,e.height=Math.max(e.height,n.height),e.top=Math.min(e.top,n.top),e.right=Math.min(e.right,n.right),e.bottom=Math.min(e.bottom,n.bottom),e.left=Math.min(e.left,n.left)}),e}get viewport(){let e={readingOrder:[],progressions:new Map,positions:null};return(this.perPage<2?[this.pub.readingOrder.items[this.currentSlide]]:this.spreader.currentSpread(this.currentSlide,this.perPage)).forEach(t=>{e.readingOrder.push(t.href),e.progressions.set(t.href,{start:0,end:1})}),e.positions=this.getCurrentNumbers(),e}getCurrentNumbers(){if(this.perPage<2)return[this.pub.readingOrder.items[this.currentSlide].properties?.otherProperties.number];let e=this.spreader.currentSpread(this.currentSlide,this.perPage);return e.length>1?[e[0].properties?.otherProperties.number,e[e.length-1].properties?.otherProperties.number]:[e[0].properties?.otherProperties.number]}deselect(){this.currentFrames?.forEach(e=>e?.deselect())}},Rs=class e{constructor(e={}){this.backgroundColor=K(e.backgroundColor),this.blendFilter=q(e.blendFilter),this.constraint=J(e.constraint),this.columnCount=J(e.columnCount),this.darkenFilter=Ao(e.darkenFilter),this.deprecatedFontSize=q(e.deprecatedFontSize),this.fontFamily=K(e.fontFamily),this.fontSize=jo(e.fontSize,_o.range),this.fontSizeNormalize=q(e.fontSizeNormalize),this.fontOpticalSizing=q(e.fontOpticalSizing),this.fontWeight=jo(e.fontWeight,vo.range),this.fontWidth=jo(e.fontWidth,yo.range),this.hyphens=q(e.hyphens),this.invertFilter=Ao(e.invertFilter),this.invertGaijiFilter=Ao(e.invertGaijiFilter),this.iOSPatch=q(e.iOSPatch),this.iPadOSPatch=q(e.iPadOSPatch),this.letterSpacing=J(e.letterSpacing),this.ligatures=q(e.ligatures),this.lineHeight=J(e.lineHeight),this.linkColor=K(e.linkColor),this.noRuby=q(e.noRuby),this.pageGutter=J(e.pageGutter),this.paragraphIndent=J(e.paragraphIndent),this.paragraphSpacing=J(e.paragraphSpacing),this.scroll=q(e.scroll),this.scrollPaddingTop=J(e.scrollPaddingTop),this.scrollPaddingBottom=J(e.scrollPaddingBottom),this.scrollPaddingLeft=J(e.scrollPaddingLeft),this.scrollPaddingRight=J(e.scrollPaddingRight),this.selectionBackgroundColor=K(e.selectionBackgroundColor),this.selectionTextColor=K(e.selectionTextColor),this.textAlign=ko(e.textAlign,ho),this.textColor=K(e.textColor),this.textNormalization=q(e.textNormalization),this.visitedColor=K(e.visitedColor),this.wordSpacing=J(e.wordSpacing),this.optimalLineLength=J(e.optimalLineLength),this.maximalLineLength=J(e.maximalLineLength),this.minimalLineLength=J(e.minimalLineLength)}static serialize(e){let{...t}=e;return JSON.stringify(t)}static deserialize(t){try{let n=JSON.parse(t);return new e(n)}catch(e){return console.error(`Failed to deserialize preferences:`,e),null}}merging(t){let n={...this};for(let e of Object.keys(t))t[e]!==void 0&&(e!==`maximalLineLength`||t[e]===null||t[e]>=(t.optimalLineLength??n.optimalLineLength??65))&&(e!==`minimalLineLength`||t[e]===null||t[e]<=(t.optimalLineLength??n.optimalLineLength??65))&&(n[e]=t[e]);return new e(n)}},zs=class{constructor(e){this.backgroundColor=K(e.backgroundColor)||null,this.blendFilter=q(e.blendFilter)??!1,this.constraint=J(e.constraint)||0,this.columnCount=J(e.columnCount)||null,this.darkenFilter=Ao(e.darkenFilter)??!1,this.deprecatedFontSize=q(e.deprecatedFontSize),(this.deprecatedFontSize===!1||this.deprecatedFontSize===null)&&(this.deprecatedFontSize=!CSS.supports(`zoom`,`1`)),this.fontFamily=K(e.fontFamily)||null,this.fontSize=jo(e.fontSize,_o.range)||1,this.fontSizeNormalize=q(e.fontSizeNormalize)??!1,this.fontOpticalSizing=q(e.fontOpticalSizing)??null,this.fontWeight=jo(e.fontWeight,vo.range)||null,this.fontWidth=jo(e.fontWidth,yo.range)||null,this.hyphens=q(e.hyphens)??null,this.invertFilter=Ao(e.invertFilter)??!1,this.invertGaijiFilter=Ao(e.invertGaijiFilter)??!1,this.iOSPatch=e.iOSPatch!==!1&&(D.OS.iOS||D.OS.iPadOS)&&D.iOSRequest===`mobile`,this.iPadOSPatch=e.iPadOSPatch!==!1&&D.OS.iPadOS&&D.iOSRequest===`desktop`,this.letterSpacing=J(e.letterSpacing)||null,this.ligatures=q(e.ligatures)??null,this.lineHeight=J(e.lineHeight)||null,this.linkColor=K(e.linkColor)||null,this.noRuby=q(e.noRuby)??!1,this.pageGutter=Mo(J(e.pageGutter),20),this.paragraphIndent=J(e.paragraphIndent)??null,this.paragraphSpacing=J(e.paragraphSpacing)??null,this.scroll=q(e.scroll)??!1,this.scrollPaddingTop=J(e.scrollPaddingTop)??null,this.scrollPaddingBottom=J(e.scrollPaddingBottom)??null,this.scrollPaddingLeft=J(e.scrollPaddingLeft)??null,this.scrollPaddingRight=J(e.scrollPaddingRight)??null,this.selectionBackgroundColor=K(e.selectionBackgroundColor)||null,this.selectionTextColor=K(e.selectionTextColor)||null,this.textAlign=ko(e.textAlign,ho)||null,this.textColor=K(e.textColor)||null,this.textNormalization=q(e.textNormalization)??!1,this.visitedColor=K(e.visitedColor)||null,this.wordSpacing=J(e.wordSpacing)||null,this.optimalLineLength=J(e.optimalLineLength)||65,this.maximalLineLength=Mo(Oo(e.maximalLineLength,this.optimalLineLength),80),this.minimalLineLength=Mo(Do(e.minimalLineLength,this.optimalLineLength),40),this.experiments=No(e.experiments)||null}},Bs={backgroundColor:`#FFFFFF`,textColor:`#121212`,linkColor:`#0000EE`,visitedColor:`#551A8B`,selectionBackgroundColor:`#b4d8fe`,selectionTextColor:`inherit`},Vs=class{constructor(e,t,n){this.preferences=new Rs({...e}),this.settings=t,this.metadata=n,this.layout=this.metadata?.effectiveLayout||S.reflowable}clear(){this.preferences=new Rs({backgroundColor:null,blendFilter:null,columnCount:null,constraint:null,darkenFilter:null,deprecatedFontSize:null,fontFamily:null,fontSize:null,fontSizeNormalize:null,fontOpticalSizing:null,fontWeight:null,fontWidth:null,hyphens:null,invertFilter:null,invertGaijiFilter:null,iOSPatch:null,iPadOSPatch:null,letterSpacing:null,ligatures:null,lineHeight:null,linkColor:null,maximalLineLength:null,minimalLineLength:null,noRuby:null,optimalLineLength:null,pageGutter:null,paragraphIndent:null,paragraphSpacing:null,scroll:null,scrollPaddingTop:null,scrollPaddingBottom:null,scrollPaddingLeft:null,scrollPaddingRight:null,selectionBackgroundColor:null,selectionTextColor:null,textAlign:null,textColor:null,textNormalization:null,visitedColor:null,wordSpacing:null})}updatePreference(e,t){this.preferences[e]=t}get backgroundColor(){return new Y({initialValue:this.preferences.backgroundColor,effectiveValue:this.settings.backgroundColor||Bs.backgroundColor,isEffective:this.preferences.backgroundColor!==null,onChange:e=>{this.updatePreference(`backgroundColor`,e??null)}})}get blendFilter(){return new X({initialValue:this.preferences.blendFilter,effectiveValue:this.settings.blendFilter||!1,isEffective:this.preferences.blendFilter!==null,onChange:e=>{this.updatePreference(`blendFilter`,e??null)}})}get columnCount(){return new Y({initialValue:this.preferences.columnCount,effectiveValue:this.settings.columnCount||null,isEffective:this.layout!==S.fixed&&!this.settings.scroll,onChange:e=>{this.updatePreference(`columnCount`,e??null)}})}get constraint(){return new Y({initialValue:this.preferences.constraint,effectiveValue:this.preferences.constraint||0,isEffective:!0,onChange:e=>{this.updatePreference(`constraint`,e??null)}})}get darkenFilter(){return new Z({initialValue:typeof this.preferences.darkenFilter==`boolean`?100:this.preferences.darkenFilter,effectiveValue:typeof this.settings.darkenFilter==`boolean`?100:this.settings.darkenFilter||0,isEffective:this.settings.darkenFilter!==null,onChange:e=>{this.updatePreference(`darkenFilter`,e??null)},supportedRange:go.range,step:go.step})}get deprecatedFontSize(){return new X({initialValue:this.preferences.deprecatedFontSize,effectiveValue:!CSS.supports(`zoom`,`1`)||this.settings.deprecatedFontSize||!1,isEffective:this.layout!==S.fixed,onChange:e=>{this.updatePreference(`deprecatedFontSize`,e??null)}})}get fontFamily(){return new Y({initialValue:this.preferences.fontFamily,effectiveValue:this.settings.fontFamily||null,isEffective:this.layout!==S.fixed,onChange:e=>{this.updatePreference(`fontFamily`,e??null)}})}get fontSize(){return new Z({initialValue:this.preferences.fontSize,effectiveValue:this.settings.fontSize||1,isEffective:this.layout!==S.fixed,onChange:e=>{this.updatePreference(`fontSize`,e??null)},supportedRange:_o.range,step:_o.step})}get fontSizeNormalize(){return new X({initialValue:this.preferences.fontSizeNormalize,effectiveValue:this.settings.fontSizeNormalize||!1,isEffective:this.layout!==S.fixed&&this.preferences.fontSizeNormalize!==null,onChange:e=>{this.updatePreference(`fontSizeNormalize`,e??null)}})}get fontOpticalSizing(){return new X({initialValue:this.preferences.fontOpticalSizing,effectiveValue:this.settings.fontOpticalSizing||!0,isEffective:this.layout!==S.fixed&&this.preferences.fontOpticalSizing!==null,onChange:e=>{this.updatePreference(`fontOpticalSizing`,e??null)}})}get fontWeight(){return new Z({initialValue:this.preferences.fontWeight,effectiveValue:this.settings.fontWeight||400,isEffective:this.layout!==S.fixed&&this.preferences.fontWeight!==null,onChange:e=>{this.updatePreference(`fontWeight`,e??null)},supportedRange:vo.range,step:vo.step})}get fontWidth(){return new Z({initialValue:this.preferences.fontWidth,effectiveValue:this.settings.fontWidth||100,isEffective:this.layout!==S.fixed&&this.preferences.fontWidth!==null,onChange:e=>{this.updatePreference(`fontWidth`,e??null)},supportedRange:yo.range,step:yo.step})}get hyphens(){return new X({initialValue:this.preferences.hyphens,effectiveValue:this.settings.hyphens||!1,isEffective:this.layout!==S.fixed&&this.metadata?.effectiveReadingProgression===R.ltr&&this.preferences.hyphens!==null,onChange:e=>{this.updatePreference(`hyphens`,e??null)}})}get invertFilter(){return new Z({initialValue:typeof this.preferences.invertFilter==`boolean`?100:this.preferences.invertFilter,effectiveValue:typeof this.settings.invertFilter==`boolean`?100:this.settings.invertFilter||0,isEffective:this.settings.invertFilter!==null,onChange:e=>{this.updatePreference(`invertFilter`,e??null)},supportedRange:go.range,step:go.step})}get invertGaijiFilter(){return new Z({initialValue:typeof this.preferences.invertGaijiFilter==`boolean`?100:this.preferences.invertGaijiFilter,effectiveValue:typeof this.settings.invertGaijiFilter==`boolean`?100:this.settings.invertGaijiFilter||0,isEffective:this.preferences.invertGaijiFilter!==null,onChange:e=>{this.updatePreference(`invertGaijiFilter`,e??null)},supportedRange:go.range,step:go.step})}get iOSPatch(){return new X({initialValue:this.preferences.iOSPatch,effectiveValue:this.settings.iOSPatch||!1,isEffective:this.layout!==S.fixed,onChange:e=>{this.updatePreference(`iOSPatch`,e??null)}})}get iPadOSPatch(){return new X({initialValue:this.preferences.iPadOSPatch,effectiveValue:this.settings.iPadOSPatch||!1,isEffective:this.layout!==S.fixed,onChange:e=>{this.updatePreference(`iPadOSPatch`,e??null)}})}get letterSpacing(){return new Z({initialValue:this.preferences.letterSpacing,effectiveValue:this.settings.letterSpacing||0,isEffective:this.layout!==S.fixed&&this.preferences.letterSpacing!==null,onChange:e=>{this.updatePreference(`letterSpacing`,e??null)},supportedRange:bo.range,step:bo.step})}get ligatures(){return new X({initialValue:this.preferences.ligatures,effectiveValue:this.settings.ligatures||!0,isEffective:(()=>{if(this.preferences.ligatures===null||this.layout===S.fixed)return!1;let e=this.metadata?.languages?.[0]?.toLowerCase();return!(e&&[`zh`,`ja`,`ko`,`mn-mong`].some(t=>e.startsWith(t)))})(),onChange:e=>{this.updatePreference(`ligatures`,e??null)}})}get lineHeight(){return new Z({initialValue:this.preferences.lineHeight,effectiveValue:this.settings.lineHeight,isEffective:this.layout!==S.fixed&&this.preferences.lineHeight!==null,onChange:e=>{this.updatePreference(`lineHeight`,e??null)},supportedRange:xo.range,step:xo.step})}get linkColor(){return new Y({initialValue:this.preferences.linkColor,effectiveValue:this.settings.linkColor||Bs.linkColor,isEffective:this.layout!==S.fixed&&this.preferences.linkColor!==null,onChange:e=>{this.updatePreference(`linkColor`,e??null)}})}get maximalLineLength(){return new Z({initialValue:this.preferences.maximalLineLength,effectiveValue:this.settings.maximalLineLength,isEffective:this.layout!==S.fixed,onChange:e=>{this.updatePreference(`maximalLineLength`,e)},supportedRange:So.range,step:So.step})}get minimalLineLength(){return new Z({initialValue:this.preferences.minimalLineLength,effectiveValue:this.settings.minimalLineLength,isEffective:this.layout!==S.fixed,onChange:e=>{this.updatePreference(`minimalLineLength`,e)},supportedRange:So.range,step:So.step})}get noRuby(){return new X({initialValue:this.preferences.noRuby,effectiveValue:this.settings.noRuby||!1,isEffective:this.layout!==S.fixed&&this.metadata?.languages?.includes(`ja`)||!1,onChange:e=>{this.updatePreference(`noRuby`,e??null)}})}get optimalLineLength(){return new Z({initialValue:this.preferences.optimalLineLength,effectiveValue:this.settings.optimalLineLength,isEffective:this.layout!==S.fixed,onChange:e=>{this.updatePreference(`optimalLineLength`,e)},supportedRange:So.range,step:So.step})}get pageGutter(){return new Y({initialValue:this.preferences.pageGutter,effectiveValue:this.settings.pageGutter,isEffective:this.layout!==S.fixed&&!this.settings.scroll,onChange:e=>{this.updatePreference(`pageGutter`,e??null)}})}get paragraphIndent(){return new Z({initialValue:this.preferences.paragraphIndent,effectiveValue:this.settings.paragraphIndent||0,isEffective:this.layout!==S.fixed&&this.preferences.paragraphIndent!==null,onChange:e=>{this.updatePreference(`paragraphIndent`,e??null)},supportedRange:Co.range,step:Co.step})}get paragraphSpacing(){return new Z({initialValue:this.preferences.paragraphSpacing,effectiveValue:this.settings.paragraphSpacing||0,isEffective:this.layout!==S.fixed&&this.preferences.paragraphSpacing!==null,onChange:e=>{this.updatePreference(`paragraphSpacing`,e??null)},supportedRange:wo.range,step:wo.step})}get scroll(){return new X({initialValue:this.preferences.scroll,effectiveValue:this.settings.scroll||!1,isEffective:this.layout!==S.fixed,onChange:e=>{this.updatePreference(`scroll`,e??null)}})}get scrollPaddingTop(){return new Y({initialValue:this.preferences.scrollPaddingTop,effectiveValue:this.settings.scrollPaddingTop||0,isEffective:this.layout!==S.fixed&&!!this.settings.scroll&&this.preferences.scrollPaddingTop!==null,onChange:e=>{this.updatePreference(`scrollPaddingTop`,e??null)}})}get scrollPaddingBottom(){return new Y({initialValue:this.preferences.scrollPaddingBottom,effectiveValue:this.settings.scrollPaddingBottom||0,isEffective:this.layout!==S.fixed&&!!this.settings.scroll&&this.preferences.scrollPaddingBottom!==null,onChange:e=>{this.updatePreference(`scrollPaddingBottom`,e??null)}})}get scrollPaddingLeft(){return new Y({initialValue:this.preferences.scrollPaddingLeft,effectiveValue:this.settings.scrollPaddingLeft||0,isEffective:this.layout!==S.fixed&&!!this.settings.scroll&&this.preferences.scrollPaddingLeft!==null,onChange:e=>{this.updatePreference(`scrollPaddingLeft`,e??null)}})}get scrollPaddingRight(){return new Y({initialValue:this.preferences.scrollPaddingRight,effectiveValue:this.settings.scrollPaddingRight||0,isEffective:this.layout!==S.fixed&&!!this.settings.scroll&&this.preferences.scrollPaddingRight!==null,onChange:e=>{this.updatePreference(`scrollPaddingRight`,e??null)}})}get selectionBackgroundColor(){return new Y({initialValue:this.preferences.selectionBackgroundColor,effectiveValue:this.settings.selectionBackgroundColor||Bs.selectionBackgroundColor,isEffective:this.layout!==S.fixed&&this.preferences.selectionBackgroundColor!==null,onChange:e=>{this.updatePreference(`selectionBackgroundColor`,e??null)}})}get selectionTextColor(){return new Y({initialValue:this.preferences.selectionTextColor,effectiveValue:this.settings.selectionTextColor||Bs.selectionTextColor,isEffective:this.layout!==S.fixed&&this.preferences.selectionTextColor!==null,onChange:e=>{this.updatePreference(`selectionTextColor`,e??null)}})}get textAlign(){return new Po({initialValue:this.preferences.textAlign,effectiveValue:this.settings.textAlign||ho.start,isEffective:this.layout!==S.fixed&&this.preferences.textAlign!==null,onChange:e=>{this.updatePreference(`textAlign`,e??null)},supportedValues:Object.values(ho)})}get textColor(){return new Y({initialValue:this.preferences.textColor,effectiveValue:this.settings.textColor||Bs.textColor,isEffective:this.layout!==S.fixed&&this.preferences.textColor!==null,onChange:e=>{this.updatePreference(`textColor`,e??null)}})}get textNormalization(){return new X({initialValue:this.preferences.textNormalization,effectiveValue:this.settings.textNormalization||!1,isEffective:this.layout!==S.fixed,onChange:e=>{this.updatePreference(`textNormalization`,e??null)}})}get visitedColor(){return new Y({initialValue:this.preferences.visitedColor,effectiveValue:this.settings.visitedColor||Bs.visitedColor,isEffective:this.layout!==S.fixed&&this.preferences.visitedColor!==null,onChange:e=>{this.updatePreference(`visitedColor`,e??null)}})}get wordSpacing(){return new Z({initialValue:this.preferences.wordSpacing,effectiveValue:this.settings.wordSpacing||0,isEffective:this.layout!==S.fixed&&this.preferences.wordSpacing!==null,onChange:e=>{this.updatePreference(`wordSpacing`,e??null)},supportedRange:To.range,step:To.step})}};function Hs(e){let t=getComputedStyle(e),n=parseFloat(t.paddingLeft||`0`),r=parseFloat(t.paddingRight||`0`);return e.clientWidth-n-r}function Us(e){let t=getComputedStyle(e),n=parseFloat(t.paddingTop||`0`),r=parseFloat(t.paddingBottom||`0`);return e.clientHeight-n-r}var Ws=class extends Eo{constructor(e){super(),this.a11yNormalize=e.a11yNormalize??null,this.backgroundColor=e.backgroundColor??null,this.blendFilter=e.blendFilter??null,this.bodyHyphens=e.bodyHyphens??null,this.colCount=e.colCount??null,this.darkenFilter=e.darkenFilter??null,this.deprecatedFontSize=e.deprecatedFontSize??null,this.fontFamily=e.fontFamily??null,this.fontOpticalSizing=e.fontOpticalSizing??null,this.fontSize=e.fontSize??null,this.fontSizeNormalize=e.fontSizeNormalize??null,this.fontWeight=e.fontWeight??null,this.fontWidth=e.fontWidth??null,this.invertFilter=e.invertFilter??null,this.invertGaijiFilter=e.invertGaijiFilter??null,this.iOSPatch=e.iOSPatch??null,this.iPadOSPatch=e.iPadOSPatch??null,this.letterSpacing=e.letterSpacing??null,this.ligatures=e.ligatures??null,this.lineHeight=e.lineHeight??null,this.lineLength=e.lineLength??null,this.linkColor=e.linkColor??null,this.noRuby=e.noRuby??null,this.paraIndent=e.paraIndent??null,this.paraSpacing=e.paraSpacing??null,this.selectionBackgroundColor=e.selectionBackgroundColor??null,this.selectionTextColor=e.selectionTextColor??null,this.textAlign=e.textAlign??null,this.textColor=e.textColor??null,this.view=e.view??null,this.visitedColor=e.visitedColor??null,this.wordSpacing=e.wordSpacing??null}toCSSProperties(){let e={};return this.a11yNormalize&&(e[`--USER__a11yNormalize`]=this.toFlag(`a11y`)),this.backgroundColor&&(e[`--USER__backgroundColor`]=this.backgroundColor),this.blendFilter&&(e[`--USER__blendFilter`]=this.toFlag(`blend`)),this.bodyHyphens&&(e[`--USER__bodyHyphens`]=this.bodyHyphens),this.colCount&&(e[`--USER__colCount`]=this.toUnitless(this.colCount)),this.darkenFilter===!0?e[`--USER__darkenFilter`]=this.toFlag(`darken`):typeof this.darkenFilter==`number`&&(e[`--USER__darkenFilter`]=this.toPercentage(this.darkenFilter)),this.deprecatedFontSize&&(e[`--USER__fontSizeImplementation`]=this.toFlag(`deprecatedFontSize`)),this.fontFamily&&(e[`--USER__fontFamily`]=this.fontFamily),this.fontOpticalSizing!=null&&(e[`--USER__fontOpticalSizing`]=this.fontOpticalSizing),this.fontSize!=null&&(e[`--USER__fontSize`]=this.toPercentage(this.fontSize,!0)),this.fontSizeNormalize&&(e[`--USER__fontSizeNormalize`]=this.toFlag(`normalize`)),this.fontWeight!=null&&(e[`--USER__fontWeight`]=this.toUnitless(this.fontWeight)),this.fontWidth!=null&&(e[`--USER__fontWidth`]=typeof this.fontWidth==`string`?this.fontWidth:this.toUnitless(this.fontWidth)),this.invertFilter===!0?e[`--USER__invertFilter`]=this.toFlag(`invert`):typeof this.invertFilter==`number`&&(e[`--USER__invertFilter`]=this.toPercentage(this.invertFilter)),this.invertGaijiFilter===!0?e[`--USER__invertGaiji`]=this.toFlag(`invertGaiji`):typeof this.invertGaijiFilter==`number`&&(e[`--USER__invertGaiji`]=this.toPercentage(this.invertGaijiFilter)),this.iOSPatch&&(e[`--USER__iOSPatch`]=this.toFlag(`iOSPatch`)),this.iPadOSPatch&&(e[`--USER__iPadOSPatch`]=this.toFlag(`iPadOSPatch`)),this.letterSpacing!=null&&(e[`--USER__letterSpacing`]=this.toRem(this.letterSpacing)),this.ligatures&&(e[`--USER__ligatures`]=this.ligatures),this.lineHeight!=null&&(e[`--USER__lineHeight`]=this.toUnitless(this.lineHeight)),this.lineLength!=null&&(e[`--USER__lineLength`]=this.toPx(this.lineLength)),this.linkColor&&(e[`--USER__linkColor`]=this.linkColor),this.noRuby&&(e[`--USER__noRuby`]=this.toFlag(`noRuby`)),this.paraIndent!=null&&(e[`--USER__paraIndent`]=this.toRem(this.paraIndent)),this.paraSpacing!=null&&(e[`--USER__paraSpacing`]=this.toRem(this.paraSpacing)),this.selectionBackgroundColor&&(e[`--USER__selectionBackgroundColor`]=this.selectionBackgroundColor),this.selectionTextColor&&(e[`--USER__selectionTextColor`]=this.selectionTextColor),this.textAlign&&(e[`--USER__textAlign`]=this.textAlign),this.textColor&&(e[`--USER__textColor`]=this.textColor),this.view&&(e[`--USER__view`]=this.toFlag(this.view)),this.visitedColor&&(e[`--USER__visitedColor`]=this.visitedColor),this.wordSpacing!=null&&(e[`--USER__wordSpacing`]=this.toRem(this.wordSpacing)),e}},Gs=class extends Eo{constructor(e){super(),this.backgroundColor=e.backgroundColor??null,this.baseFontFamily=e.baseFontFamily??null,this.baseFontSize=e.baseFontSize??null,this.baseLineHeight=e.baseLineHeight??null,this.boxSizingMedia=e.boxSizingMedia??null,this.boxSizingTable=e.boxSizingTable??null,this.colWidth=e.colWidth??null,this.colCount=e.colCount??null,this.colGap=e.colGap??null,this.codeFontFamily=e.codeFontFamily??null,this.compFontFamily=e.compFontFamily??null,this.defaultLineLength=e.defaultLineLength??null,this.flowSpacing=e.flowSpacing??null,this.humanistTf=e.humanistTf??null,this.linkColor=e.linkColor??null,this.maxMediaWidth=e.maxMediaWidth??null,this.maxMediaHeight=e.maxMediaHeight??null,this.modernTf=e.modernTf??null,this.monospaceTf=e.monospaceTf??null,this.noOverflow=e.noOverflow??null,this.noVerticalPagination=e.noVerticalPagination??null,this.oldStyleTf=e.oldStyleTf??null,this.pageGutter=e.pageGutter??null,this.paraIndent=e.paraIndent??null,this.paraSpacing=e.paraSpacing??null,this.primaryColor=e.primaryColor??null,this.scrollPaddingBottom=e.scrollPaddingBottom??null,this.scrollPaddingLeft=e.scrollPaddingLeft??null,this.scrollPaddingRight=e.scrollPaddingRight??null,this.scrollPaddingTop=e.scrollPaddingTop??null,this.sansSerifJa=e.sansSerifJa??null,this.sansSerifJaV=e.sansSerifJaV??null,this.sansTf=e.sansTf??null,this.secondaryColor=e.secondaryColor??null,this.selectionBackgroundColor=e.selectionBackgroundColor??null,this.selectionTextColor=e.selectionTextColor??null,this.serifJa=e.serifJa??null,this.serifJaV=e.serifJaV??null,this.textColor=e.textColor??null,this.typeScale=e.typeScale??null,this.visitedColor=e.visitedColor??null,this.experiments=e.experiments??null}toCSSProperties(){let e={};return this.backgroundColor&&(e[`--RS__backgroundColor`]=this.backgroundColor),this.baseFontFamily&&(e[`--RS__baseFontFamily`]=this.baseFontFamily),this.baseFontSize!=null&&(e[`--RS__baseFontSize`]=this.toRem(this.baseFontSize)),this.baseLineHeight!=null&&(e[`--RS__baseLineHeight`]=this.toUnitless(this.baseLineHeight)),this.boxSizingMedia&&(e[`--RS__boxSizingMedia`]=this.boxSizingMedia),this.boxSizingTable&&(e[`--RS__boxSizingTable`]=this.boxSizingTable),this.colWidth!=null&&(e[`--RS__colWidth`]=this.colWidth),this.colCount!=null&&(e[`--RS__colCount`]=this.toUnitless(this.colCount)),this.colGap!=null&&(e[`--RS__colGap`]=this.toPx(this.colGap)),this.codeFontFamily&&(e[`--RS__codeFontFamily`]=this.codeFontFamily),this.compFontFamily&&(e[`--RS__compFontFamily`]=this.compFontFamily),this.defaultLineLength!=null&&(e[`--RS__defaultLineLength`]=this.toPx(this.defaultLineLength)),this.flowSpacing!=null&&(e[`--RS__flowSpacing`]=this.toRem(this.flowSpacing)),this.humanistTf&&(e[`--RS__humanistTf`]=this.humanistTf),this.linkColor&&(e[`--RS__linkColor`]=this.linkColor),this.maxMediaWidth&&(e[`--RS__maxMediaWidth`]=this.toVw(this.maxMediaWidth)),this.maxMediaHeight&&(e[`--RS__maxMediaHeight`]=this.toVh(this.maxMediaHeight)),this.modernTf&&(e[`--RS__modernTf`]=this.modernTf),this.monospaceTf&&(e[`--RS__monospaceTf`]=this.monospaceTf),this.noOverflow&&(e[`--RS__disableOverflow`]=this.toFlag(`noOverflow`)),this.noVerticalPagination&&(e[`--RS__disablePagination`]=this.toFlag(`noVerticalPagination`)),this.oldStyleTf&&(e[`--RS__oldStyleTf`]=this.oldStyleTf),this.pageGutter!=null&&(e[`--RS__pageGutter`]=this.toPx(this.pageGutter)),this.paraIndent!=null&&(e[`--RS__paraIndent`]=this.toRem(this.paraIndent)),this.paraSpacing!=null&&(e[`--RS__paraSpacing`]=this.toRem(this.paraSpacing)),this.primaryColor&&(e[`--RS__primaryColor`]=this.primaryColor),this.sansSerifJa&&(e[`--RS__sans-serif-ja`]=this.sansSerifJa),this.sansSerifJaV&&(e[`--RS__sans-serif-ja-v`]=this.sansSerifJaV),this.sansTf&&(e[`--RS__sansTf`]=this.sansTf),this.scrollPaddingBottom!=null&&(e[`--RS__scrollPaddingBottom`]=this.toPx(this.scrollPaddingBottom)),this.scrollPaddingLeft!=null&&(e[`--RS__scrollPaddingLeft`]=this.toPx(this.scrollPaddingLeft)),this.scrollPaddingRight!=null&&(e[`--RS__scrollPaddingRight`]=this.toPx(this.scrollPaddingRight)),this.scrollPaddingTop!=null&&(e[`--RS__scrollPaddingTop`]=this.toPx(this.scrollPaddingTop)),this.secondaryColor&&(e[`--RS__secondaryColor`]=this.secondaryColor),this.selectionBackgroundColor&&(e[`--RS__selectionBackgroundColor`]=this.selectionBackgroundColor),this.selectionTextColor&&(e[`--RS__selectionTextColor`]=this.selectionTextColor),this.serifJa&&(e[`--RS__serif-ja`]=this.serifJa),this.serifJaV&&(e[`--RS__serif-ja-v`]=this.serifJaV),this.textColor&&(e[`--RS__textColor`]=this.textColor),this.typeScale&&(e[`--RS__typeScale`]=this.toUnitless(this.typeScale)),this.visitedColor&&(e[`--RS__visitedColor`]=this.visitedColor),this.experiments&&this.experiments.forEach(t=>{e[`--RS__`+t]=mo[t].value}),e}},Ks=class{constructor(e){this.rsProperties=e.rsProperties,this.userProperties=e.userProperties,this.lineLengths=e.lineLengths,this.container=e.container,this.containerParent=e.container.parentElement||document.documentElement,this.constraint=e.constraint,this.isCJKVertical=e.isCJKVertical??!1,this.cachedColCount=e.userProperties.colCount,this.effectiveContainerWidth=Hs(this.containerParent)}update(e){this.cachedColCount=e.columnCount,e.constraint!==this.constraint&&(this.constraint=e.constraint),e.pageGutter!==this.rsProperties.pageGutter&&(this.rsProperties.pageGutter=e.pageGutter),e.scrollPaddingBottom!==this.rsProperties.scrollPaddingBottom&&(this.rsProperties.scrollPaddingBottom=e.scrollPaddingBottom),e.scrollPaddingLeft!==this.rsProperties.scrollPaddingLeft&&(this.rsProperties.scrollPaddingLeft=e.scrollPaddingLeft),e.scrollPaddingRight!==this.rsProperties.scrollPaddingRight&&(this.rsProperties.scrollPaddingRight=e.scrollPaddingRight),e.scrollPaddingTop!==this.rsProperties.scrollPaddingTop&&(this.rsProperties.scrollPaddingTop=e.scrollPaddingTop),e.experiments!==this.rsProperties.experiments&&(this.rsProperties.experiments=e.experiments),this.lineLengths.update({fontFace:e.fontFamily,letterSpacing:e.letterSpacing,padding:e.scroll?(e.scrollPaddingLeft||0)+(e.scrollPaddingRight||0):(e.pageGutter||0)*2,wordSpacing:e.wordSpacing,optimalChars:e.optimalLineLength,minChars:e.minimalLineLength,maxChars:e.maximalLineLength});let t=this.updateLayout(e.fontSize,e.deprecatedFontSize||e.iOSPatch,e.scroll,e.columnCount);t?.effectiveContainerWidth&&(this.effectiveContainerWidth=t?.effectiveContainerWidth);let n={a11yNormalize:e.textNormalization,backgroundColor:e.backgroundColor,blendFilter:e.blendFilter,bodyHyphens:typeof e.hyphens==`boolean`?e.hyphens?`auto`:`none`:null,colCount:t?.colCount,darkenFilter:e.darkenFilter,deprecatedFontSize:e.deprecatedFontSize,fontFamily:e.fontFamily,fontOpticalSizing:typeof e.fontOpticalSizing==`boolean`?e.fontOpticalSizing?`auto`:`none`:null,fontSize:e.fontSize,fontSizeNormalize:e.fontSizeNormalize,fontWeight:e.fontWeight,fontWidth:e.fontWidth,invertFilter:e.invertFilter,invertGaijiFilter:e.invertGaijiFilter,iOSPatch:e.iOSPatch,iPadOSPatch:e.iPadOSPatch,letterSpacing:e.letterSpacing,ligatures:typeof e.ligatures==`boolean`?e.ligatures?`common-ligatures`:`none`:null,lineHeight:e.lineHeight,lineLength:t?.effectiveLineLength,linkColor:e.linkColor,noRuby:e.noRuby,paraIndent:e.paragraphIndent,paraSpacing:e.paragraphSpacing,selectionBackgroundColor:e.selectionBackgroundColor,selectionTextColor:e.selectionTextColor,textAlign:e.textAlign,textColor:e.textColor,view:typeof e.scroll==`boolean`?e.scroll?`scroll`:`paged`:null,visitedColor:e.visitedColor,wordSpacing:e.wordSpacing};this.userProperties=new Ws(n)}updateLayout(e,t,n,r){return this.isCJKVertical?this.computeCJKVerticalLength(e,t):n??this.userProperties.view===`scroll`?this.computeScrollLength(e,t):this.paginate(e,t,r)}getCompensatedMetrics(e,t){let n=e||this.userProperties.fontSize||1;return{zoomFactor:n,zoomCompensation:n<1?1/n:t?n:1,optimal:Math.round(this.lineLengths.optimalLineLength)*n,minimal:this.lineLengths.minimalLineLength===null?null:Math.round(this.lineLengths.minimalLineLength*n),maximal:this.lineLengths.maximalLineLength===null?null:Math.round(this.lineLengths.maximalLineLength*n)}}paginate(e,t,n){let r=Math.round(Hs(this.containerParent)-this.constraint),{zoomCompensation:i,optimal:a,minimal:o,maximal:s}=this.getCompensatedMetrics(e,t),c=()=>r>=a&&s!==null?Math.min(Math.round(s*i),r):r,l=1,u=r;if(n===void 0)return{colCount:void 0,effectiveContainerWidth:u,effectiveLineLength:Math.round(u/l*i)};if(n===null){if(r>=a&&s!==null){l=Math.floor(r/a);let e=Math.round(s*i*l);u=Math.min(e,r)}else u=c()}else if(n>1){if(r>=Math.round(n*(o===null?a:o))){if(l=n,s===null)u=r;else{let e=Math.round(s*i*l);u=Math.min(e,r)}}else if(o!==null&&r<Math.round(n*o)){if(l=Math.floor(r/o),l<=1)l=1,u=c();else{let e=Math.round(a*i*l);u=Math.min(e,r)}}else{l=n;let e=Math.round(a*i*l);u=Math.min(e,r)}}else l=1,u=c();return{colCount:l,effectiveContainerWidth:u,effectiveLineLength:Math.round(u/l/(e&&e>=1?e:1)*i)}}computeCJKVerticalLength(e,t){let n=Math.round(Hs(this.containerParent)-this.constraint),r=Math.round(Us(this.containerParent)),i=this.getCompensatedMetrics(e,t);return{colCount:void 0,effectiveContainerWidth:n,effectiveLineLength:i.maximal===null?r:Math.min(Math.round(i.maximal*i.zoomCompensation),r)}}computeScrollLength(e,t){let n=Math.round(Hs(this.containerParent)-this.constraint),r=this.getCompensatedMetrics(e&&(e<1||t)?e:1,t),i=r.zoomCompensation,a=r.optimal,o=r.maximal,s,c=n,l=Math.round(a*i);if(o===null)l=n;else{let e=Math.min(Math.round(o*i),n);l=t?e:Math.round(e*i)}return{colCount:s,effectiveContainerWidth:c,effectiveLineLength:l}}setContainerWidth(){this.container.style.width=`${this.effectiveContainerWidth}px`}resizeHandler(){let e=this.updateLayout(this.userProperties.fontSize,this.userProperties.deprecatedFontSize||this.userProperties.iOSPatch,this.userProperties.view===`scroll`,this.cachedColCount);this.userProperties.colCount=e.colCount,this.userProperties.lineLength=e.effectiveLineLength,this.effectiveContainerWidth=e.effectiveContainerWidth,this.container.style.width=`${this.effectiveContainerWidth}px`}},qs=`modulepreload`,Js=function(e){return`/`+e},Ys={},$=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=function(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))};document.getElementsByTagName(`link`);let n=document.querySelector(`meta[property=csp-nonce]`),i=n?.nonce||n?.getAttribute(`nonce`);r=e(t.map(e=>{if(e=Js(e),e in Ys)return;Ys[e]=!0;let t=e.endsWith(`.css`),n=t?`[rel="stylesheet"]`:``;if(document.querySelector(`link[href="${e}"]${n}`))return;let r=document.createElement(`link`);if(r.rel=t?`stylesheet`:qs,t||(r.as=`script`),r.crossOrigin=``,r.href=e,i&&r.setAttribute(`nonce`,i),document.head.appendChild(r),t)return new Promise((t,n)=>{r.addEventListener(`load`,t),r.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${e}`)))})}))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},Xs=`// Note: we aren't blocking some of the events right now to try and be as nonintrusive as possible.
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
`,Zs=r({default:()=>Qs}),Qs,$s=n((()=>{Qs=`/*!
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
}`})),ec=r({default:()=>tc}),tc,nc=n((()=>{tc=`/*!
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
}`})),rc=r({default:()=>ic}),ic,ac=n((()=>{ic=`/*!
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
}`})),oc=r({default:()=>sc}),sc,cc=n((()=>{sc=`/*!
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
}`})),lc=r({default:()=>uc}),uc,dc=n((()=>{uc=`/*!
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
}`})),fc=r({default:()=>pc}),pc,mc=n((()=>{pc=`/*!
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
}`})),hc=r({default:()=>gc}),gc,_c=n((()=>{gc=`/*!
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
}`})),vc=r({default:()=>yc}),yc,bc=n((()=>{yc=`/*!
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
}`})),xc=r({default:()=>Sc}),Sc,Cc=n((()=>{Sc=`/*!
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
}`})),wc=r({default:()=>Tc}),Tc,Ec=n((()=>{Tc=`/*!
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
}`})),Dc=r({default:()=>Oc}),Oc,kc=n((()=>{Oc=`/*!
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
}`})),Ac=r({default:()=>jc}),jc,Mc=n((()=>{jc=`/*!
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
}`})),Nc=r({default:()=>Pc}),Pc,Fc=n((()=>{Pc=`/* Readium CSS
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
}`}));async function Ic(e,t){let n=e.effectiveLayout===S.fixed,r=t.filter(e=>e.mediaType.isHTML).map(e=>e.href),i=r.length>0?r:[/\.xhtml$/,/\.html$/],a=[{id:`css-selector-generator`,as:`script`,target:`head`,blob:new Blob([Bo(Ho)],{type:`text/javascript`})},{id:`execution-prevention`,as:`script`,target:`head`,blob:new Blob([Bo(Xs)],{type:`text/javascript`}),condition:e=>!!(e.querySelector(`script`)||e.querySelector(`body[onload]:not(body[onload=''])`))}],o=[{id:`onload-proxy`,as:`script`,target:`head`,blob:new Blob([Bo(Uo)],{type:`text/javascript`}),condition:e=>!!(e.querySelector(`script`)||e.querySelector(`body[onload]:not(body[onload=''])`))}];if(!n){let t=po(e),n,r,i;switch(t){case`rtl`:{let[e,t,a]=await Promise.all([$(()=>Promise.resolve().then(()=>($s(),Zs)),[]),$(()=>Promise.resolve().then(()=>(nc(),ec)),[]),$(()=>Promise.resolve().then(()=>(ac(),rc)),[])]);n=e.default,r=t.default,i=a.default;break}case`cjk-horizontal`:{let[e,t,a]=await Promise.all([$(()=>Promise.resolve().then(()=>(cc(),oc)),[]),$(()=>Promise.resolve().then(()=>(dc(),lc)),[]),$(()=>Promise.resolve().then(()=>(mc(),fc)),[])]);n=e.default,r=t.default,i=a.default;break}case`cjk-vertical`:case`mongolian-vertical`:{let[e,t,a]=await Promise.all([$(()=>Promise.resolve().then(()=>(_c(),hc)),[]),$(()=>Promise.resolve().then(()=>(bc(),vc)),[]),$(()=>Promise.resolve().then(()=>(Cc(),xc)),[])]);n=e.default,r=t.default,i=a.default;break}default:{let[e,t,a]=await Promise.all([$(()=>Promise.resolve().then(()=>(Ec(),wc)),[]),$(()=>Promise.resolve().then(()=>(kc(),Dc)),[]),$(()=>Promise.resolve().then(()=>(Mc(),Ac)),[])]);n=e.default,r=t.default,i=a.default;break}}if(a.unshift({id:`readium-css-before`,as:`link`,target:`head`,blob:new Blob([Vo(n)],{type:`text/css`}),rel:`stylesheet`}),o.unshift({id:`readium-css-default`,as:`link`,target:`head`,blob:new Blob([Vo(r)],{type:`text/css`}),rel:`stylesheet`,condition:e=>!(e.querySelector(`link[rel='stylesheet']`)||e.querySelector(`style`)||e.querySelector(`[style]:not([style=''])`))},{id:`readium-css-after`,as:`link`,target:`head`,blob:new Blob([Vo(i)],{type:`text/css`}),rel:`stylesheet`}),(t===`cjk-horizontal`||t===`cjk-vertical`)&&(e.description===`ebpaj-guide-1.0`||e.otherMetadata?.[`ebpaj:guide-version`]!==void 0)){let{default:e}=await $(async()=>{let{default:e}=await Promise.resolve().then(()=>(Fc(),Nc));return{default:e}},[]);o.push({id:`readium-css-ebpaj`,as:`link`,target:`head`,blob:new Blob([Vo(e)],{type:`text/css`}),rel:`stylesheet`})}}return[{resources:i,prepend:a,append:o}]}var Lc=class{constructor(e,t){this.backgroundColor=e.backgroundColor||t.backgroundColor||null,this.blendFilter=typeof e.blendFilter==`boolean`?e.blendFilter:t.blendFilter??null,this.columnCount=e.columnCount===void 0?t.columnCount===void 0?null:t.columnCount:e.columnCount,this.constraint=e.constraint||t.constraint,this.darkenFilter=typeof e.darkenFilter==`boolean`?e.darkenFilter:t.darkenFilter??null,this.deprecatedFontSize=typeof e.deprecatedFontSize==`boolean`?e.deprecatedFontSize:t.deprecatedFontSize??null,this.fontFamily=e.fontFamily||t.fontFamily||null,this.fontSize=e.fontSize===void 0?t.fontSize===void 0?null:t.fontSize:e.fontSize,this.fontSizeNormalize=typeof e.fontSizeNormalize==`boolean`?e.fontSizeNormalize:t.fontSizeNormalize??null,this.fontOpticalSizing=typeof e.fontOpticalSizing==`boolean`?e.fontOpticalSizing:t.fontOpticalSizing??null,this.fontWeight=e.fontWeight===void 0?t.fontWeight===void 0?null:t.fontWeight:e.fontWeight,this.fontWidth=e.fontWidth===void 0?t.fontWidth===void 0?null:t.fontWidth:e.fontWidth,this.hyphens=typeof e.hyphens==`boolean`?e.hyphens:t.hyphens??null,this.invertFilter=typeof e.invertFilter==`boolean`?e.invertFilter:t.invertFilter??null,this.invertGaijiFilter=typeof e.invertGaijiFilter==`boolean`?e.invertGaijiFilter:t.invertGaijiFilter??null,this.iOSPatch=this.deprecatedFontSize||e.iOSPatch===!1?!1:e.iOSPatch===!0?(D.OS.iOS||D.OS.iPadOS)&&D.iOSRequest===`mobile`:t.iOSPatch,this.iPadOSPatch=this.deprecatedFontSize||e.iPadOSPatch===!1?!1:e.iPadOSPatch===!0?D.OS.iPadOS&&D.iOSRequest===`desktop`:t.iPadOSPatch,this.letterSpacing=e.letterSpacing===void 0?t.letterSpacing===void 0?null:t.letterSpacing:e.letterSpacing,this.ligatures=typeof e.ligatures==`boolean`?e.ligatures:t.ligatures??null,this.lineHeight=e.lineHeight===void 0?t.lineHeight===void 0?null:t.lineHeight:e.lineHeight,this.linkColor=e.linkColor||t.linkColor||null,this.maximalLineLength=e.maximalLineLength===null?null:e.maximalLineLength||t.maximalLineLength||null,this.minimalLineLength=e.minimalLineLength===null?null:e.minimalLineLength||t.minimalLineLength||null,this.noRuby=typeof e.noRuby==`boolean`?e.noRuby:t.noRuby??null,this.optimalLineLength=e.optimalLineLength||t.optimalLineLength,this.pageGutter=e.pageGutter===void 0?t.pageGutter===void 0?null:t.pageGutter:e.pageGutter,this.paragraphIndent=e.paragraphIndent===void 0?t.paragraphIndent===void 0?null:t.paragraphIndent:e.paragraphIndent,this.paragraphSpacing=e.paragraphSpacing===void 0?t.paragraphSpacing===void 0?null:t.paragraphSpacing:e.paragraphSpacing,this.scroll=typeof e.scroll==`boolean`?e.scroll:t.scroll??null,this.scrollPaddingTop=e.scrollPaddingTop===void 0?t.scrollPaddingTop===void 0?null:t.scrollPaddingTop:e.scrollPaddingTop,this.scrollPaddingBottom=e.scrollPaddingBottom===void 0?t.scrollPaddingBottom===void 0?null:t.scrollPaddingBottom:e.scrollPaddingBottom,this.scrollPaddingLeft=e.scrollPaddingLeft===void 0?t.scrollPaddingLeft===void 0?null:t.scrollPaddingLeft:e.scrollPaddingLeft,this.scrollPaddingRight=e.scrollPaddingRight===void 0?t.scrollPaddingRight===void 0?null:t.scrollPaddingRight:e.scrollPaddingRight,this.selectionBackgroundColor=e.selectionBackgroundColor||t.selectionBackgroundColor||null,this.selectionTextColor=e.selectionTextColor||t.selectionTextColor||null,this.textAlign=e.textAlign||t.textAlign||null,this.textColor=e.textColor||t.textColor||null,this.textNormalization=typeof e.textNormalization==`boolean`?e.textNormalization:t.textNormalization??null,this.visitedColor=e.visitedColor||t.visitedColor||null,this.wordSpacing=e.wordSpacing===void 0?t.wordSpacing===void 0?null:t.wordSpacing:e.wordSpacing,this.experiments=t.experiments||null}},Rc={oldStyleTf:`'Iowan Old Style', Sitka, 'Sitka Text', Palatino, 'Book Antiqua', 'URW Palladio L', P052, serif`},zc=16,Bc=Rc.oldStyleTf,Vc=class e{constructor(t){this._optimalLineLength=null,this._canvas=document.createElement(`canvas`),this._optimalChars=t.optimalChars,this._minChars=t.minChars,this._maxChars=t.maxChars,this._baseFontSize=t.baseFontSize||zc,this._fontFace=t.fontFace||Bc,this._sample=t.sample||null,this._padding=t.padding??0,this._letterSpacing=t.letterSpacing?Math.round(t.letterSpacing*this._baseFontSize):0,this._wordSpacing=t.wordSpacing?Math.round(t.wordSpacing*this._baseFontSize):0,this._isCJK=t.isCJK||!1,this._getRelative=t.getRelative||!1,this._minDivider=this._minChars&&this._minChars<this._optimalChars?this._optimalChars/this._minChars:this._minChars===null?null:1,this._maxMultiplier=this._maxChars&&this._maxChars>this._optimalChars?this._maxChars/this._optimalChars:this._maxChars===null?null:1,this._approximatedWordSpaces=e.approximateWordSpaces(this._optimalChars,this._sample)}updateMultipliers(){this._minDivider=this._minChars&&this._minChars<this._optimalChars?this._optimalChars/this._minChars:this._minChars===null?null:1,this._maxMultiplier=this._maxChars&&this._maxChars>this._optimalChars?this._maxChars/this._optimalChars:this._maxChars===null?null:1}update(t){t.optimalChars&&(this._optimalChars=t.optimalChars),t.minChars!==void 0&&(this._minChars=t.minChars),t.maxChars!==void 0&&(this._maxChars=t.maxChars),t.baseFontSize&&(this._baseFontSize=t.baseFontSize),t.fontFace!==void 0&&(this._fontFace=t.fontFace||Bc),t.letterSpacing&&(this._letterSpacing=t.letterSpacing),t.wordSpacing&&(this._wordSpacing=t.wordSpacing),t.isCJK!=null&&(this._isCJK=t.isCJK),t.padding!==void 0&&(this._padding=t.padding??0),t.getRelative&&(this._getRelative=t.getRelative),t.sample&&(this._sample=t.sample,this._approximatedWordSpaces=e.approximateWordSpaces(this._optimalChars,this._sample)),this.updateMultipliers(),this._optimalLineLength=this.getOptimalLineLength()}get baseFontSize(){return this._baseFontSize}get minimalLineLength(){return this._optimalLineLength||(this._optimalLineLength=this.getOptimalLineLength()),this._minDivider===null?null:Math.round(this._optimalLineLength/this._minDivider+this._padding)/(this._getRelative?this._baseFontSize:1)}get maximalLineLength(){return this._optimalLineLength||(this._optimalLineLength=this.getOptimalLineLength()),this._maxMultiplier===null?null:Math.round(this._optimalLineLength*this._maxMultiplier+this._padding)/(this._getRelative?this._baseFontSize:1)}get optimalLineLength(){return this._optimalLineLength||(this._optimalLineLength=this.getOptimalLineLength()),Math.round(this._optimalLineLength+this._padding)/(this._getRelative?this._baseFontSize:1)}get all(){return this._optimalLineLength||(this._optimalLineLength=this.getOptimalLineLength()),{min:this.minimalLineLength,max:this.maximalLineLength,optimal:this.optimalLineLength,baseFontSize:this._baseFontSize}}static approximateWordSpaces(e,t){let n=0;if(t&&t.length>=e){let r=t.match(/([\s]+)/gi);n=(r?r.length:0)*(e/t.length)}return n}getLineLengthFallback(){let e=this._letterSpacing*(this._optimalChars-1),t=this._wordSpacing*this._approximatedWordSpaces;return this._optimalChars*(this._baseFontSize*.5)+e+t}getOptimalLineLength(){if(this._fontFace){if(typeof this._fontFace==`string`)return this.measureText(this._fontFace);{let e=new FontFace(this._fontFace.name,`url(${this._fontFace.url})`);e.load().then(()=>(document.fonts.add(e),this.measureText(e.family)),e=>{})}}return this.getLineLengthFallback()}measureText(t){let n=this._canvas.getContext(`2d`);if(n&&t){let r=this._isCJK?`水`.repeat(this._optimalChars):`0`.repeat(this._optimalChars);if(n.font=`${this._baseFontSize}px ${t}`,this._sample&&this._sample.length>=this._optimalChars&&(r=this._sample.slice(0,this._optimalChars)),Object.hasOwn(n,`letterSpacing`)&&Object.hasOwn(n,`wordSpacing`))return n.letterSpacing=this._letterSpacing.toString()+`px`,n.wordSpacing=this._wordSpacing.toString()+`px`,n.measureText(r).width;{let t=this._letterSpacing*(this._optimalChars-1),i=this._wordSpacing*e.approximateWordSpaces(this._optimalChars,this._sample);return n.measureText(r).width+t+i}}return this.getLineLengthFallback()}},Hc=1e3,Uc=`https://navigator.invalid/`,Wc=e=>({frameLoaded:e.frameLoaded||(()=>{}),positionChanged:e.positionChanged||(()=>{}),viewportChanged:e.viewportChanged||(()=>{}),timelineItemChanged:e.timelineItemChanged||(()=>{}),tap:e.tap||(()=>!1),click:e.click||(()=>!1),zoom:e.zoom||(()=>{}),miscPointer:e.miscPointer||(()=>{}),scroll:e.scroll||(()=>{}),customEvent:e.customEvent||(()=>{}),handleLocator:e.handleLocator||(()=>!1),textSelected:e.textSelected||(()=>{}),contentProtection:e.contentProtection||(()=>{}),contextMenu:e.contextMenu||(()=>{}),peripheral:e.peripheral||(()=>{})});function Gc(e,t){return e.length===t.length&&e.every((e,n)=>e===t[n])}return e.EpubNavigator=class e extends Xa{constructor(t,n,r,i=[],a=void 0,o={preferences:{},defaults:{}}){super(),this._destroyed=!1,this._visibleFragmentIds=[],this._notifiedVisibleFragmentIds=[],this._timelineAugmented=!1,this._preferencesEditor=null,this._injector=null,this._isNavigating=!1,this._navigatorProtector=null,this._keyboardPeripheralsManager=null,this._suspiciousActivityListener=null,this._keyboardPeripheralListener=null,this._decorations=new Map,this._decorationObservers=new Map,this._decorationHoveredDecorations=new Map,this._decorationActivationState=new Map,this._decorationHoverState=new Map,this._decorationActivationConsumed=!1,this._navigationLocked=!1,this._pointedPieceRequests=new Map,this._pointedPieceRequestId=0,this.reflowViewport={readingOrder:[],progressions:new Map,positions:null},this.pub=n,this.container=t,this.listeners=Wc(r),this.currentLocation=a,i.length&&(this.positions=i),this._preferences=new Rs(o.preferences),this._defaults=new zs(o.defaults),this._settings=new Lc(this._preferences,this._defaults);let s=po(n.metadata),c=s===`cjk-horizontal`,l=s===`cjk-vertical`,u=l||s===`mongolian-vertical`,d=c||l;this._css=new Ks({rsProperties:new Gs({noVerticalPagination:u||void 0}),userProperties:new Ws({}),lineLengths:new Vc({optimalChars:this._settings.optimalLineLength,minChars:this._settings.minimalLineLength,maxChars:this._settings.maximalLineLength,padding:this._settings.scroll?(this._settings.scrollPaddingLeft||0)+(this._settings.scrollPaddingRight||0):(this._settings.pageGutter||0)*2,fontFace:this._settings.fontFamily,letterSpacing:this._settings.letterSpacing,wordSpacing:this._settings.wordSpacing,isCJK:d}),container:t,constraint:this._settings.constraint,isCJKVertical:u}),this._layout=e.determineLayout(n,!!this._settings.scroll),this.currentProgression=n.metadata.effectiveReadingProgression,this._injectablesConfig=o.injectables||{rules:[],allowedDomains:[]},this._readiumRulesPromise=Ic(n.metadata,n.readingOrder.items),this._contentProtection=o.contentProtection||{},this._decoratorConfig=o.decoratorConfig||{},this._decorationResizeSelectors=new Set(this._decoratorConfig.resizeWatchSelectors??[]),this._upgradeInsecureRequests=o.upgradeInsecureRequests??`always`,this._keyboardPeripherals=this.mergeKeyboardPeripherals(this._contentProtection,o.keyboardPeripherals||[]),(this._contentProtection.disableContextMenu||this._contentProtection.checkAutomation||this._contentProtection.checkIFrameEmbedding||this._contentProtection.monitorDevTools||this._contentProtection.protectPrinting?.disable)&&(this._navigatorProtector=new ss(this._contentProtection),this._suspiciousActivityListener=e=>{let{type:t,...n}=e.detail;t===`context_menu`?this.listeners.contextMenu(n):this.listeners.contentProtection(t,n)},window.addEventListener(`readium:navigator:suspiciousActivity`,this._suspiciousActivityListener)),this._keyboardPeripherals.length>0&&(this._keyboardPeripheralsManager=new ls({keyboardPeripherals:this._keyboardPeripherals}),this._keyboardPeripheralListener=e=>{let t=e.detail;this.listeners.peripheral(t)},window.addEventListener(`readium:navigator:keyboardPeripheral`,this._keyboardPeripheralListener)),this.resizeObserver=new ResizeObserver(()=>this.ownerWindow.requestAnimationFrame(async()=>await this.resizeHandler())),this.resizeObserver.observe(this.container.parentElement||document.documentElement)}static determineLayout(e,t){let n=e.metadata.effectiveLayout;if(n===S.fixed||e.metadata.otherMetadata&&`http://openmangaformat.org/schema/1.0#version`in e.metadata.otherMetadata||e.metadata?.conformsTo?.includes(F.DIVINA))return S.fixed;if(n===S.scrolled)return S.scrolled;let r=po(e.metadata);return r===`cjk-vertical`||r===`mongolian-vertical`||n===S.reflowable&&t?S.scrolled:S.reflowable}async load(){if(this.positions?.length||(this.positions=await this.pub.positionsFromManifest()),!this._injector){let e=await this._readiumRulesPromise;this._injector=new zo({rules:[...e,...this._injectablesConfig.rules],allowedDomains:this._injectablesConfig.allowedDomains})}if(!this._destroyed){if(this._layout===S.fixed)this.framePool=new Ls(this.container,this.positions,this.pub,this._layout,this._injector,this._contentProtection,this._keyboardPeripherals,[...this._decorationResizeSelectors],this._upgradeInsecureRequests),this.framePool.listener=(e,t)=>{this.eventListener(e,t)};else{if(await this.updateCSS(!1),this._destroyed)return;let e=this.compileCSSProperties(this._css);this.framePool=new _s(this.container,this.positions,e,this._injector,this._contentProtection,this._keyboardPeripherals,e=>this.pub.timeline.segmentsForHref(e).flatMap(e=>e.references).map(e=>{let t=e.indexOf(`#`);return t>=0?Te(e.slice(t+1)):``}).filter(Boolean),[...this._decorationResizeSelectors],this._upgradeInsecureRequests)}if(this.currentLocation=this.currentLocation===void 0?this.positions[0]:this.completeLocator(this.currentLocation),await this.resizeHandler(),!this._destroyed)return new Promise(e=>{if(this._destroyed)return e(!1);this.go(this.currentLocation,!1,e)})}}get settings(){if(this._layout===S.fixed)return Object.freeze({...this._settings});{let e=this._css.userProperties.colCount||this._css.rsProperties.colCount||this._settings.columnCount;return Object.freeze({...this._settings,columnCount:e})}}get preferencesEditor(){return this._preferencesEditor===null&&(this._preferencesEditor=new Vs(this._preferences,this.settings,this.pub.metadata)),this._preferencesEditor}async submitPreferences(e){this._preferences=this._preferences.merging(e),await this.applyPreferences()}async applyPreferences(){let e=this._settings;this._settings=new Lc(this._preferences,this._defaults),this._preferencesEditor!==null&&(this._preferencesEditor=new Vs(this._preferences,this.settings,this.pub.metadata)),this._layout===S.fixed?this.handleFXLPrefs(e,this._settings):await this.updateCSS(!0)}handleFXLPrefs(e,t){e.columnCount!==t.columnCount&&(this.framePool.setPerPage(t.columnCount),this.ownerWindow.requestAnimationFrame(()=>this.notifyViewportChange(this.listeners.viewportChanged)))}async updateCSS(e){this._css.update(this._settings),e&&await this.commitCSS(this._css)}compileCSSProperties(e){let t={};for(let[n,r]of Object.entries(e.rsProperties.toCSSProperties()))t[n]=r;for(let[n,r]of Object.entries(e.userProperties.toCSSProperties()))t[n]=r;return t}async commitCSS(e){if(!this.framePool)return;let t=this.compileCSSProperties(e);this.framePool.setCSSProperties(t),this._css.userProperties.view===`paged`&&this._layout===S.scrolled?await this.setLayout(S.reflowable):this._css.userProperties.view===`scroll`&&this._layout===S.reflowable&&await this.setLayout(S.scrolled),this._css.setContainerWidth()}async resizeHandler(){let e=this.container.parentElement||document.documentElement;if(this._layout===S.fixed){let t=Hs(e)-this._settings.constraint;if(Q()?this.container.attributeStyleMap.set(`width`,CSS.px(t)):this.container.style.width=`${t}px`,!this.framePool)return;this.framePool.resizeHandler(),this.notifyViewportChange(this.listeners.viewportChanged)}else{let e=this._css.userProperties.colCount,t=this._css.userProperties.lineLength;this._css.resizeHandler(),(this._css.userProperties.view!==`scroll`&&e!==this._css.userProperties.colCount||t!==this._css.userProperties.lineLength)&&await this.commitCSS(this._css)}}get layout(){return this._layout}get ownerWindow(){return this.container.ownerDocument.defaultView||window}get _cframes(){return(this.framePool?.currentFrames??[]).filter(e=>!(e instanceof ms&&e.isDestroyed))}get pool(){return this.framePool}eventListener(e,t,n){switch(e){case`_pong`:if(this.listeners.frameLoaded(this._cframes[0].iframe.contentWindow),this.listeners.positionChanged(this.currentLocation),this._notifyTimelineChange(this.currentLocation),n){let e=this._cframes.filter(e=>!!e).indexOf(n),t=e>=0?this.viewport.readingOrder[e]:void 0;t&&this._reapplyDecorationsToFrame(n,t)}else this._reapplyDecorationsToCurrentFrames();this._watchTextLayoutInCurrentFrame(!0),this._sendNavigationLock();break;case`text_layout`:n&&n===this._textLayoutFrame&&this.currentLocation.href.split(`#`)[0]===this._textLayoutWatch?.href&&this._textLayoutWatch.cb(t);break;case`pointed_piece`:{let{id:e,index:n}=t;this._pointedPieceRequests.get(e)?.(n);break}case`first_visible_locator`:let r=M.deserialize(t);if(!r)break;this.currentLocation=new M({href:this.currentLocation.href,type:this.currentLocation.type,title:this.currentLocation.title,locations:r?.locations,text:r?.text}),this.listeners.positionChanged(this.currentLocation),this._notifyTimelineChange(this.currentLocation);break;case`text_selected`:{let e=t;if(n){let t=this._cframes.filter(e=>!!e).indexOf(n),r=t>=0?this.viewport.readingOrder[t]:void 0;r&&(e.locator=new M({href:r,type:this.pub.readingOrder.findWithHref(r).type||`application/xhtml+xml`,text:new st({highlight:e.text})}))}this.listeners.textSelected(e);break}case`decoration_activated`:this._handleDecorationActivated(t)&&(this._decorationActivationConsumed=!0);break;case`decoration_pointer_enter`:this._handleDecorationPointerEnter(t);break;case`decoration_pointer_leave`:this._handleDecorationPointerLeave(t);break;case`click`:case`tap`:if(this._decorationActivationConsumed){this._decorationActivationConsumed=!1;break}let i=t;if(i.interactiveElement){let e=new DOMParser().parseFromString(i.interactiveElement,`text/html`).body.children[0];if(e.nodeType===e.ELEMENT_NODE&&e.nodeName===`A`&&e.hasAttribute(`href`)){let t=e.attributes.getNamedItem(`href`)?.value;if(t.startsWith(`#`))this._navigationLocked||this.go(this.currentLocation.copyWithLocations({fragments:[new URL(t,Uc).hash.slice(1)]}),!1,()=>{});else if(t.startsWith(`http://`)||t.startsWith(`https://`)||t.startsWith(`mailto:`)||t.startsWith(`tel:`))this.listeners.handleLocator(new N({href:t}).locator);else if(!this._navigationLocked)try{this.goLink(new N({href:fo.join(fo.dirname(this.currentLocation.href),t)}),!1,()=>{})}catch(e){console.warn(`Couldn't go to link for ${t}: ${e}`),this.listeners.handleLocator(new N({href:t}).locator)}}else console.log(`Clicked on`,e)}else{if(this._layout===S.fixed&&this.framePool.doNotDisturb&&(i.doNotDisturb=!0),i.x+=this._spreadOffsetX(i.targetFrameSrc),e===`click`?this.listeners.click(i):this.listeners.tap(i))break;let t=(this._cframes.length===2?this._cframes[0].window.innerWidth+this._cframes[1].window.innerWidth:this._cframes[0].window.innerWidth)*window.devicePixelRatio/4;if(i.x>=t&&i.x<=t*3&&this.listeners.miscPointer(1),this._navigationLocked)break;i.x<t?this.goLeft(!1,()=>{}):i.x>t*3&&this.goRight(!1,()=>{})}break;case`tap_more`:this.listeners.miscPointer(t);break;case`no_more`:this._navigationLocked||this.changeResource(1);break;case`no_less`:this._navigationLocked||this.changeResource(-1);break;case`swipe`:break;case`scroll`:this.listeners.scroll(t);break;case`zoom`:this.listeners.zoom(t);break;case`progress`:{let e=n instanceof ms?this.framePool._frameFor(this.currentLocation.href.split(`#`)[0]):void 0;if(n instanceof ms&&n!==e)break;this.syncLocation(t);break}case`content_protection`:let a=t;this.listeners.contentProtection(a.type,a);break;case`context_menu`:this.listeners.contextMenu(t);break;case`keyboard_peripherals`:let o=t,s={...o,interactiveElement:void 0};o.interactiveElement&&(s.interactiveElement=new DOMParser().parseFromString(o.interactiveElement,`text/html`).body.children[0]),this.listeners.peripheral(s);break;case`log`:console.log(this._cframes[0]?.source?.split(`/`)[3],...t);break;default:this.listeners.customEvent(e,t)}}determineModules(){let e=Array.from(Ua.keys());if(this._layout===S.fixed)return e.filter(e=>Va.includes(e));e=e.filter(e=>Ha.includes(e));let t=po(this.pub.metadata);if(t===`cjk-vertical`||t===`mongolian-vertical`)return e.filter(e=>e!==`column_snapper`&&e!==`scroll_snapper`);let n=e;return e=this._layout===S.scrolled?n.filter(e=>e!==`column_snapper`&&e!==`cjk_vertical_snapper`):n.filter(e=>e!==`scroll_snapper`&&e!==`cjk_vertical_snapper`),e}attachListener(){let e=this._cframes.filter(e=>!!e);if(e.length===0)throw Error(`no cframe to attach listener to`);e.forEach(e=>{e.msg&&(e.msg.listener=(t,n)=>{this.eventListener(t,n,e)})}),this._reapplyDecorationsToCurrentFrames(),this._watchTextLayoutInCurrentFrame(),this._sendNavigationLock()}async apply(){if(await this.framePool.update(this.pub,this.currentLocator,this.determineModules()),this.attachListener(),this.pub.readingOrder.findIndexWithHref(this.currentLocation.href)<0)throw Error(`Link for `+this.currentLocation.href+` not found!`);this.notifyViewportChange(this.listeners.viewportChanged)}supportsDecorationStyle(e){return Qa(e,this._decoratorConfig.decorationTemplates)}registerDecorationObserver(e,t){this._decorationObservers.has(e)||this._decorationObservers.set(e,new Set),this._decorationObservers.get(e).add(t),t.onDecorationActivated&&(this._decorationActivationState.set(e,!0),this._sendDecorationActivationToFrames(e,!0)),(t.onDecorationPointerEnter||t.onDecorationPointerLeave)&&(this._decorationHoverState.set(e,!0),this._sendDecorationHoverToFrames(e,!0))}unregisterDecorationObserver(e){this._decorationObservers.forEach((t,n)=>{if(!t.has(e))return;t.delete(e);let r=[...t].some(e=>e.onDecorationActivated);this._decorationActivationState.has(n)&&!r&&(this._decorationActivationState.delete(n),this._sendDecorationActivationToFrames(n,!1));let i=[...t].some(e=>e.onDecorationPointerEnter||e.onDecorationPointerLeave);this._decorationHoverState.has(n)&&!i&&(this._decorationHoverState.delete(n),this._sendDecorationHoverToFrames(n,!1))})}_sendDecorationActivationToFrames(e,t){this._cframes.filter(e=>!!e).forEach(n=>{n.msg&&n.msg.send(`decoration_activatable`,{group:e,activatable:t})})}_sendDecorationHoverToFrames(e,t){this._cframes.filter(e=>!!e).forEach(n=>{n.msg&&n.msg.send(`decoration_hoverable`,{group:e,hoverable:t})})}addDecorationResizeTarget(e){this._decorationResizeSelectors.add(e),this.framePool?.addResizeTarget(e)}removeDecorationResizeTarget(e){this._decorationResizeSelectors.delete(e),this.framePool?.removeResizeTarget(e)}applyDecorations(e,t){let n=this._decorations.get(t)??[],r=new Map(n.map(e=>[e.id,e])),i=new Map(e.map(e=>[e.id,e])),a=[],o=[],s=[];for(let[e,t]of r)i.has(e)?no(t,i.get(e))||s.push(i.get(e)):a.push(e);for(let[e,t]of i)r.has(e)||o.push(t);this._decorations.set(t,e),this._sendDecorationOps(t,a,o,s,n);let c=this._decorationActivationState.get(t);c!==void 0&&this._sendDecorationActivationToFrames(t,c);let l=this._decorationHoverState.get(t);l!==void 0&&this._sendDecorationHoverToFrames(t,l)}_sendDecorationOps(e,t,n,r,i){let a=this._cframes.filter(e=>!!e),o=new Map(i.map(e=>[e.id,e])),s=this.viewport.readingOrder;a.forEach((i,a)=>{if(!i.msg)return;let c=s[a];if(c){for(let n of t){let t=o.get(n);!t||t.locator.href!==c||i.msg.send(`decorate`,{group:e,action:`remove`,decoration:{id:n}})}for(let t of n)t.locator.href===c&&i.msg.send(`decorate`,{group:e,action:`add`,decoration:$a(t,this._decoratorConfig.decorationTemplates)});for(let t of r)o.get(t.id)?.locator.href===c&&t.locator.href!==c&&i.msg.send(`decorate`,{group:e,action:`remove`,decoration:{id:t.id}}),t.locator.href===c&&i.msg.send(`decorate`,{group:e,action:`update`,decoration:$a(t,this._decoratorConfig.decorationTemplates)})}})}_reapplyDecorationsToFrame(e,t){if(e.msg){for(let[n,r]of this._decorations){let i=r.filter(e=>e.locator.href===t);e.msg.send(`decorate`,{group:n,action:`clear`});for(let t of i)e.msg.send(`decorate`,{group:n,action:`add`,decoration:$a(t,this._decoratorConfig.decorationTemplates)})}for(let[t,n]of this._decorationActivationState)e.msg.send(`decoration_activatable`,{group:t,activatable:n});for(let[t,n]of this._decorationHoverState)e.msg.send(`decoration_hoverable`,{group:t,hoverable:n})}}_reapplyDecorationsToCurrentFrames(){let e=this._cframes.filter(e=>!!e),t=this.viewport.readingOrder;e.forEach((e,n)=>{let r=t[n];r&&this._reapplyDecorationsToFrame(e,r)})}watchTextLayout(e,t){let n={href:e[0]?.href.split(`#`)[0]??``,pieces:e.map(e=>[e.text?.serialize(),$e(e.locations)]),cb:t};return this._textLayoutWatch=n,this._watchTextLayoutInCurrentFrame(!0),()=>{this._textLayoutWatch===n&&(this._textLayoutWatch=void 0,this._watchTextLayoutInCurrentFrame())}}lockNavigation(e){this._navigationLocked=e,this._sendNavigationLock()}_sendNavigationLock(){this._cframes.forEach(e=>{e instanceof ms&&e.msg?.send(`lock_navigation`,this._navigationLocked)})}_spreadOffsetX(e){if(this._layout!==S.fixed||this.currentProgression!==R.rtl&&this.currentProgression!==R.ltr)return 0;let t=this.framePool.currentFrames;if(t.length<2)return 0;let n=this.currentProgression===R.rtl;return e===t[+!n]?.source?(t[+!!n]?.iframe.contentWindow?.innerWidth??0)*window.devicePixelRatio:0}async findPointedPiece(e,t,n,r){let i=this._cframes.filter(e=>!!e),a=i.findIndex(t=>t.source===e.targetFrameSrc),o=a>=0?this.viewport.readingOrder[a]:void 0;if(!o||!e.cssSelector)return;let s=t.filter(e=>e.href.split(`#`)[0]===o);if(s.length===0)return;let c=`${++this._pointedPieceRequestId}`,l,u=await new Promise(t=>{this._pointedPieceRequests.set(c,t),l=setTimeout(()=>t(-1),Hc);let u={id:c,cssSelector:e.cssSelector,x:e.x-this._spreadOffsetX(e.targetFrameSrc),y:e.y,pieces:s.map(e=>[e.text?.serialize(),$e(e.locations)]),rules:n,current:r?.href.split(`#`)[0]===o?[r.text?.serialize(),$e(r.locations)]:void 0};i[a].msg?.send(`pointed_piece`,u,()=>t(-1))||t(-1)});return clearTimeout(l),this._pointedPieceRequests.delete(c),s[u]}_watchTextLayoutInCurrentFrame(e=!1){let t=this._cframes[0],n=this._textLayoutWatch,r=n&&t instanceof ms&&this.currentLocation?.href.split(`#`)[0]===n.href?t:void 0;if(r===this._textLayoutFrame&&!e)return;let i=this._textLayoutFrame;i&&i!==r&&!i.isDestroyed&&i.msg?.send(`watch_text_layout`,[]),this._textLayoutFrame=r,r&&n&&r.msg?.send(`watch_text_layout`,n.pieces)}_handleDecorationActivated(e){let t=this._decorationObservers.get(e.group);if(!t||t.size===0)return!1;let n=(this._decorations.get(e.group)??[]).find(t=>t.id===e.decorationId);if(!n)return!1;let r={decoration:n,group:e.group,rect:e.rect,point:e.point},i=!1;for(let e of t)e.onDecorationActivated?.(r)&&(i=!0);return i}_handleDecorationPointerEnter(e){let t=this._decorationObservers.get(e.group);if(!t||t.size===0)return;let n=(this._decorations.get(e.group)??[]).find(t=>t.id===e.decorationId);if(!n)return;this._decorationHoveredDecorations.set(e.group,n);let r={decoration:n,group:e.group,rect:e.rect,point:e.point};for(let e of t)e.onDecorationPointerEnter?.(r)}_handleDecorationPointerLeave(e){let t=this._decorationObservers.get(e.group);if(!t||t.size===0)return;let n=(this._decorations.get(e.group)??[]).find(t=>t.id===e.decorationId)??this._decorationHoveredDecorations.get(e.group);if(this._decorationHoveredDecorations.delete(e.group),!n)return;let r={decoration:n,group:e.group,rect:e.rect,point:e.point};for(let e of t)e.onDecorationPointerLeave?.(r)}async destroy(){this._destroyed=!0,this._suspiciousActivityListener&&window.removeEventListener(`readium:navigator:suspiciousActivity`,this._suspiciousActivityListener),this._keyboardPeripheralListener&&window.removeEventListener(`readium:navigator:keyboardPeripheral`,this._keyboardPeripheralListener),this._navigatorProtector?.destroy(),this._keyboardPeripheralsManager?.destroy(),await this.framePool?.destroy(),this._decorations.clear(),this._decorationObservers.clear(),this._decorationHoveredDecorations.clear(),this._decorationActivationState.clear(),this._decorationHoverState.clear(),this._decorationResizeSelectors.clear()}async changeResource(e){if(e===0)return!1;if(this._layout===S.fixed){let t=this.framePool,n=t.viewport.positions[0];if(e===1){if(!t.next(t.perPage))return!1}else if(e===-1){if(!t.prev(t.perPage))return!1}else throw Error(`Invalid relative value for FXL`);let r=t.viewport.positions[0];if(n>r){for(let e=this.positions.length-1;e>=0;e--)if(this.positions[e].href===this.pub.readingOrder.items[r-1].href){this.currentLocation=this.positions[e].copyWithLocations({progression:.999999999999});break}}else if(n<r){for(let e=0;e<this.positions.length;e++)if(this.positions[e].href===this.pub.readingOrder.items[r-1].href){this.currentLocation=this.positions[e];break}}return await this.apply(),this.listeners.positionChanged(this.currentLocation),this._notifyTimelineChange(this.currentLocation),!0}let t=this.pub.readingOrder.findIndexWithHref(this.currentLocation.href),n=Math.max(0,Math.min(this.pub.readingOrder.items.length-1,t+e));if(n===t)return this._cframes[0]?.msg?.send(`shake`,void 0,async e=>{}),!1;if(t>n){for(let e=this.positions.length-1;e>=0;e--)if(this.positions[e].href===this.pub.readingOrder.items[n].href){this.currentLocation=this.positions[e].copyWithLocations({progression:.999999999999});break}}else for(let e=0;e<this.positions.length;e++)if(this.positions[e].href===this.pub.readingOrder.items[n].href){this.currentLocation=this.positions[e];break}return await this.apply(),!0}findLastPositionInProgressionRange(e,t){let n=e.findLastIndex(e=>{let n=e.locations.progression;return!!(n&&n>t.start&&n<=t.end)});return n===-1?void 0:e[n]}findNearestPositions(e){let t=this.positions.filter(e=>e.href===this.currentLocation.href),n=this.currentLocation,r,i=t.findLastIndex(t=>(t.locations.progression??0)<=e.start);if(i!==-1){n=t[i];let a=t.slice(i+1);r=this.findLastPositionInProgressionRange(a,e)}return{first:n,last:r}}updateViewport(e){this.reflowViewport.readingOrder=[],this.reflowViewport.progressions.clear(),this.reflowViewport.positions=null,this.currentLocation&&(this.reflowViewport.readingOrder.push(this.currentLocation.href),this.reflowViewport.progressions.set(this.currentLocation.href,e),this.currentLocation.locations?.position!==void 0&&(this.reflowViewport.positions=[this.currentLocation.locations.position],this.lastLocationInView?.locations?.position!==void 0&&this.reflowViewport.positions.push(this.lastLocationInView.locations.position)))}async syncLocation(e){let t=e,n=this.findNearestPositions(t);this.currentLocation=n.first.copyWithLocations({progression:t.start}),this.lastLocationInView=n.last,this.updateViewport(t),this.notifyViewportChange(this.listeners.viewportChanged),this.listeners.positionChanged(this.currentLocation);let r=t.fragmentId?this.currentLocation.copyWithLocations({fragments:[encodeURIComponent(t.fragmentId)]}):this.currentLocation;this._visibleFragmentIds=t.visibleFragmentIds??[],this._notifyTimelineChange(r);let i=this._cframes;await this.framePool.update(this.pub,this.currentLocation,this.determineModules()),this._cframes.some((e,t)=>e&&e!==i[t])&&this.attachListener()}goBackward(e,t){this._isNavigating?t(!1):(this._isNavigating=!0,this._layout===S.fixed?this.changeResource(-1).then(e=>{this._isNavigating=!1,t(e)}).catch(e=>{console.error(e),this._isNavigating=!1,t(!1)}):this._cframes[0]?.msg?.send(`go_prev`,void 0,async e=>{if(e)this._isNavigating=!1,t(!0);else{let e=await this.changeResource(-1);this._isNavigating=!1,t(e)}}))}goForward(e,t){this._isNavigating?t(!1):(this._isNavigating=!0,this._layout===S.fixed?this.changeResource(1).then(e=>{this._isNavigating=!1,t(e)}).catch(e=>{console.error(e),this._isNavigating=!1,t(!1)}):this._cframes[0]?.msg?.send(`go_next`,void 0,async e=>{if(e)this._isNavigating=!1,t(!0);else{let e=await this.changeResource(1);this._isNavigating=!1,t(e)}}))}get currentLocator(){return this.currentLocation}get viewport(){return this._layout===S.fixed?this.framePool?this.framePool.viewport:{readingOrder:[],progressions:new Map,positions:null}:this.reflowViewport}get isScrollStart(){let e=this.viewport.readingOrder[0];return this.viewport.progressions.get(e)?.start===0}get isScrollEnd(){let e=this.viewport.readingOrder[this.viewport.readingOrder.length-1];return this.viewport.progressions.get(e)?.end===1}get canGoBackward(){let e=this.pub.readingOrder.items[0]?.href;return!(this.viewport.progressions.has(e)&&this.viewport.progressions.get(e)?.start===0)}get canGoForward(){let e=this.pub.readingOrder.items[this.pub.readingOrder.items.length-1]?.href;return!(this.viewport.progressions.has(e)&&this.viewport.progressions.get(e)?.end===1)}get readingProgression(){return this.currentProgression}async setLayout(e){this._layout!==e&&(this._layout=e,await this.framePool.update(this.pub,this.currentLocator,this.determineModules(),!0),this.attachListener())}get publication(){return this.pub}get timeline(){let e=this.pub.timeline;if(!this._timelineAugmented&&this.positions?.length){let t=this.positions,n=new Set;e.augment((e,r)=>{if(e.children?.length)return{};let i=r.href.indexOf(`#`),a=i>=0?r.href.slice(0,i):r.href,o=i>=0?r.href.slice(i+1):void 0,s=t.filter(e=>e.href===a);if(!s.length)return{};let c=o?s.find(e=>e.locations.fragments?.[0]===o):void 0,l;return c?l=c:n.has(a)?l=void 0:(n.add(a),l=s.reduce((e,t)=>(t.locations.position??1/0)<(e.locations.position??1/0)?t:e)),l?{position:l.locations.position,scroll:c?.locations.progression}:{}}),this._timelineAugmented=!0}return this._wrappedTimeline||(this._wrappedTimeline=new Proxy(e,{get:(e,t)=>{if(t!==`navigableFrom`){let n=Reflect.get(e,t,e);return typeof n==`function`?n.bind(e):n}return t=>{let n=this._visibleFragmentIds,r=(n.length?e.locate(this.currentLocation.copyWithLocations({fragments:[encodeURIComponent(n[0])]})):void 0)??t,i=(n.length?e.locate(this.currentLocation.copyWithLocations({fragments:[encodeURIComponent(n[n.length-1])]})):void 0)??t;if(this.isScrollStart){let t=e.ancestors(r).find(e=>e.references.includes(this.currentLocation.href));t&&(r=t)}return{previous:e.navigableFrom(r).previous,next:e.navigableFrom(i).next}}}})),this._wrappedTimeline}async loadLocator(e,t){let n=!1,r=$e(e.locations);if(e.text?.highlight?n=await new Promise((t,n)=>{this._cframes[0].msg.send(`go_text`,r?[e.text?.serialize(),r]:e.text?.serialize(),e=>t(e))}):r&&(n=await new Promise((e,t)=>{this._cframes[0].msg.send(`go_text`,[``,r],t=>e(t))})),n){t(n);return}let i=rt(e.locations);if(i&&(n=await new Promise((e,t)=>{this._cframes[0].msg.send(`go_id`,i,t=>e(t))})),n){t(n);return}let a=e.locations?.progression;n=a&&a>0?await new Promise((e,t)=>{this._cframes[0].msg.send(`go_progression`,a,t=>e(t))}):!0,t(n)}completeLocator(e){if(!e.href){let t=!1;if(typeof e.locations.position==`number`){let n=this.positions.find(t=>t.locations.position===e.locations.position);n&&(e=n.copyWithLocations(e.locations),t=!0)}if(!t&&typeof e.locations?.totalProgression==`number`){let t=e.locations.totalProgression,n=0,r=1/0;for(let e=0;e<this.positions.length;e++){let i=this.positions[e].locations.totalProgression??e/this.positions.length,a=Math.abs(i-t);a<r&&(r=a,n=e)}e=this.positions[n].copyWithLocations(e.locations)}}return e}go(e,t,n){e=this.completeLocator(e);let r=e.href.split(`#`)[0],i=this.pub.readingOrder.findWithHref(r);if(!i)return n(this.listeners.handleLocator(e));this._isNavigating?n(!1):(this._isNavigating=!0,this.currentLocation=this.positions.find(e=>e.href===i.href),this.apply().then(()=>this.loadLocator(e,e=>{this._isNavigating=!1,n(e)})).then(()=>{this.attachListener()}).catch(e=>{console.error(e),this._isNavigating=!1,n(!1)}))}goLink(e,t,n){return this.go(e.locator,t,n)}_notifyTimelineChange(e){let t=this.timeline.locate(e),n=!Gc(this._visibleFragmentIds,this._notifiedVisibleFragmentIds);(t!==this._currentTimelineItem||n)&&(this._currentTimelineItem=t,this._notifiedVisibleFragmentIds=this._visibleFragmentIds,this.listeners.timelineItemChanged(t))}},e.EpubPreferences=Rs,e.HttpFetcher=a,e.Link=N,e.Locator=M,e.Manifest=Ct,e.Publication=Ot,e})({});