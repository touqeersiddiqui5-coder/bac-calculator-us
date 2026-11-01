import { estimateBAC, alcoholGrams, DENSITY } from './calculator-core.js';

const themeButton=document.querySelector('[data-theme]');
themeButton?.addEventListener('click',()=>{
  const dark=document.documentElement.dataset.theme==='dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme=dark?'light':'dark';
  themeButton.setAttribute('aria-pressed',String(!dark));
});
const menuButton=document.querySelector('[data-menu]');
menuButton?.addEventListener('click',()=>{
  const open=menuButton.getAttribute('aria-expanded')!=='true';
  menuButton.setAttribute('aria-expanded',String(open));
  document.querySelector('#main-nav').classList.toggle('open',open);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&menuButton?.getAttribute('aria-expanded')==='true'){
    menuButton.click();menuButton.focus();
  }
});

const form=document.querySelector('[data-calculator]');
if(form){
  const strings=JSON.parse(document.querySelector('#calculator-strings').textContent);
  const format=(n,d=2)=>new Intl.NumberFormat(document.documentElement.lang,{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
  const rows=form.querySelector('[data-drinks]');
  const result=document.querySelector('[data-result]');
  const status=document.querySelector('[data-result-status]');
  const error=form.querySelector('[data-error]');
  let rowId=0;
  function addDrink(type='beer'){
    if(rows.children.length>=30)return;
    const values={beer:[355,5],wine:[150,12],spirits:[45,40],custom:[330,5]}[type];
    const row=document.querySelector('#drink-template').content.cloneNode(true);
    const root=row.querySelector('.drink-row');
    root.dataset.id=++rowId;
    root.querySelector('[data-drink-name]').textContent=strings[type];
    root.querySelector('[name="volume"]').value=values[0];
    root.querySelector('[name="abv"]').value=values[1];
    for(const label of root.querySelectorAll('label')){
      const input=label.querySelector('input,select');
      if(input){input.id=`${input.name}-${rowId}`;label.htmlFor=input.id;}
    }
    const remove=root.querySelector('[data-remove]');
    remove.setAttribute('aria-label',`${strings.remove}: ${strings[type]}`);
    remove.addEventListener('click',()=>{
      root.remove();invalidate();
      form.querySelector('[data-add]').focus();
    });
    root.querySelector('[name="volumeUnit"]').addEventListener('change',e=>{
      const input=root.querySelector('[name="volume"]');
      const isOz=e.target.value==='oz';
      if(input.value!=='')input.value=(Number(input.value)*(isOz?1/29.5735295625:29.5735295625)).toFixed(isOz?2:1);
      input.max=isOz?'100':'3000';
    });
    rows.appendChild(row);
  }
  function invalidate(){
    result.hidden=true;document.querySelector('[data-result-empty]').hidden=false;
    status.textContent='';error.textContent='';
  }
  for(const button of form.querySelectorAll('[data-add]'))button.addEventListener('click',()=>{addDrink(button.dataset.add);invalidate();});
  form.addEventListener('input',invalidate);
  form.addEventListener('change',invalidate);
  form.querySelector('[name="weightUnit"]')?.addEventListener('change',e=>{
    const input=form.elements.weight;
    const lb=e.target.value==='lb';
    if(input.value!=='')input.value=(Number(input.value)*(lb?1/0.45359237:0.45359237)).toFixed(1);
    input.min=lb?'66.14':'30';input.max=lb?'771.61':'350';
  });
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const number=input=>input.value.trim()===''?NaN:Number(input.value);
    const drinks=[...rows.children].map(r=>({volume:number(r.querySelector('[name="volume"]')),unit:r.querySelector('[name="volumeUnit"]').value,abv:number(r.querySelector('[name="abv"]')),count:number(r.querySelector('[name="count"]'))}));
    try{
      const abv=form.dataset.calculator==='abv';
      const data=abv?{grams:alcoholGrams(drinks)}:estimateBAC({weight:number(form.elements.weight),weightUnit:form.elements.weightUnit.value,factor:number(form.elements.factor),hours:number(form.elements.hours),drinks});
      error.textContent='';
      document.querySelector('[data-result-empty]').hidden=true;result.hidden=false;
      // Result unit: local convention (de/sv/nb → ‰, fr/es → g/L) when the page declares one; default % BAC.
      const unit=document.documentElement.dataset.bacUnit||'%';
      const scale=(unit==='‰'||unit==='g/L')?10:1;
      const dec=unit==='%'?3:2;
      const unitSuffix=unit==='‰'?' ‰':unit==='g/L'?' g/L':'%';
      result.querySelector('[data-primary-result]').textContent=abv?format(data.grams,1)+' g':format(data.estimate*scale,dec)+unitSuffix;
      if(result.querySelector('[data-grams-result]'))result.querySelector('[data-grams-result]').textContent=format(data.grams,1)+' g';
      if(!abv){
        const rangeEl=result.querySelector('[data-range-result]');
        if(rangeEl)rangeEl.textContent=`${format(data.low*scale,dec)}–${format(data.high*scale,dec)}${unitSuffix}`;
        const permilleEl=result.querySelector('[data-permille]');
        if(permilleEl)permilleEl.textContent=format(data.estimate*10,2)+'‰';
      }else{
        for(const [id,n] of Object.entries({us:data.grams/14,uk:data.grams/DENSITY/10,au:data.grams/10,ca:data.grams/13.45}))if(result.querySelector(`[data-standard="${id}"]`))result.querySelector(`[data-standard="${id}"]`).textContent=format(n,2);
      }
      status.textContent=`${strings.estimated}: ${abv?format(data.grams,1)+' g':format(data.estimate*scale,dec)+unitSuffix}. ${strings.warning}`;
    }catch{
      invalidate();error.textContent=strings.invalid;error.focus();
    }
  });
  addDrink();
}

document.querySelector('[data-country-search]')?.addEventListener('input',e=>{
  const query=e.target.value.toLocaleLowerCase().trim();let count=0;
  for(const item of document.querySelectorAll('[data-country-card]')){
    const visible=item.textContent.toLocaleLowerCase().includes(query);item.hidden=!visible;if(visible)count++;
  }
  const empty=document.querySelector('[data-country-empty]');if(empty)empty.hidden=count>0;
});

// GDPR & Privacy Cookie Consent Manager
(function(){
  if(localStorage.getItem('bac_consent'))return;
  var lang=document.documentElement.lang||'en';
  var msgs={
    en:{text:'We use cookies and third-party technologies to ensure site functionality, analyze traffic, and support our free educational calculators. By clicking "Accept All", you consent to our use of cookies in accordance with our ',policy:'Privacy Policy',accept:'Accept All'},
    de:{text:'Wir verwenden Cookies und ähnliche Technologien, um die Website-Funktionen bereitzustellen, die Nutzung zu analysieren und unsere kostenlosen Bildungsrechner zu unterstützen. Mit dem Klick auf "Alle akzeptieren" stimmen Sie unserer ',policy:'Datenschutzerklärung zu',accept:'Alle akzeptieren'},
    fr:{text:'Nous utilisons des cookies et des technologies similaires pour assurer le bon fonctionnement du site, analyser le trafic et soutenir nos outils éducatifs gratuits. En cliquant sur "Tout accepter", vous consentez à notre ',policy:'Politique de confidentialité',accept:'Tout accepter'},
    es:{text:'Utilizamos cookies y tecnologías similares para garantizar el funcionamiento del sitio, analizar el tráfico y respaldar nuestras calculadoras educativas gratuitas. Al hacer clic en "Aceptar todo", acepta nuestra ',policy:'Política de privacidad',accept:'Aceptar todo'},
    sv:{text:'Vi använder kakor (cookies) och liknande teknik för att säkerställa webbplatsens funktion, analysera trafik och stödja våra kostnadsfria verktyg. Genom att klicka på "Godkänn alla" godkänner du vår ',policy:'Integritetspolicy',accept:'Godkänn alla'},
    nb:{text:'Vi bruker informasjonskapsler og lignende teknologi for å sikre nettstedets funksjoner, analysere trafikk og drifte våre gratis verktøy. Ved å klikke "Godta alle" godtar du vår ',policy:'Personvernerklæring',accept:'Godta alle'}
  };
  var m=msgs[lang]||msgs.en;
  var policyUrl=lang==='de'?'/de/datenschutz/':lang==='fr'?'/fr/politique-de-confidentialite/':lang==='es'?'/es/politica-de-privacidad/':lang==='sv'?'/sv/integritetspolicy/':lang==='nb'?'/nb/personvernerklaering/':'/privacy-policy/';
  var banner=document.createElement('div');
  banner.className='cookie-banner';
  banner.setAttribute('role','region');
  banner.setAttribute('aria-label','Cookie Consent');
  banner.innerHTML='<div class="cookie-text">'+m.text+'<a href="'+policyUrl+'">'+m.policy+'</a>.</div><div class="cookie-actions"><a class="cookie-btn policy" href="'+policyUrl+'">'+m.policy+'</a><button type="button" class="cookie-btn accept" data-consent-accept>'+m.accept+'</button></div>';
  document.body.appendChild(banner);
  banner.querySelector('[data-consent-accept]').addEventListener('click',function(){
    localStorage.setItem('bac_consent','granted');
    banner.hidden=true;
  });
})();
