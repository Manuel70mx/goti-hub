/* auth.js — candado familiar: teléfono + PIN de 4 dígitos, recordado por dispositivo.
   Requiere que supabase-js (UMD) ya esté cargado en la página antes de este script. */
(function(){
  const AUTH_KEY = "goti-auth-initials";
  window.GOTI_USER = localStorage.getItem(AUTH_KEY) || null;
  if (window.GOTI_USER) return; // ya autenticado en este dispositivo, no mostrar nada

  const SUPABASE_URL = "https://jgxzbnpbhbrrsedjmnbm.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpneHpibnBiaGJycnNlZGptbmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjkzMzksImV4cCI6MjA5NzkwNTMzOX0.PHAVOJYURjM0PP0_Otxa5rn1-Xc-hRhxkB6wWatp4MM";
  const authSb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const style = document.createElement("style");
  style.textContent = `
    #goti-auth-overlay{
      position:fixed; inset:0; z-index:9999; background:#F3ECD9;
      display:flex; align-items:center; justify-content:center; padding:20px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    }
    #goti-auth-overlay .box{
      max-width:340px; width:100%; background:#FBF8EF; border-radius:18px; padding:26px 24px;
      box-shadow:0 8px 30px -10px rgba(18,32,61,.35);
    }
    #goti-auth-overlay h1{ font-size:20px; font-weight:800; color:#12203D; margin:0 0 4px; }
    #goti-auth-overlay p.sub{ font-size:13px; color:#4B5768; margin:0 0 18px; }
    #goti-auth-overlay label{ font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#8A8266; display:block; margin-bottom:5px; }
    #goti-auth-overlay input{
      width:100%; box-sizing:border-box; border:1.5px solid #D9CEA9; border-radius:10px; padding:11px 12px;
      font-size:16px; color:#12203D; background:#F3ECD9; margin-bottom:14px;
    }
    #goti-auth-overlay input:focus{ outline:2px solid #12203D; outline-offset:1px; }
    #goti-auth-overlay button{
      width:100%; font-weight:800; font-size:14px; padding:12px; border-radius:10px; border:none;
      background:#12203D; color:#F3ECD9; cursor:pointer;
    }
    #goti-auth-overlay button:disabled{ opacity:.5; }
    #goti-auth-overlay .err{ color:#B4530A; font-size:12.5px; margin:-6px 0 12px; min-height:16px; }
    #goti-auth-overlay .back{ background:none; color:#4B5768; font-weight:600; font-size:12.5px; margin-top:10px; padding:4px; width:auto; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "goti-auth-overlay";
  overlay.innerHTML = `
    <div class="box">
      <h1>Familia Goti</h1>
      <p class="sub" id="goti-step-sub">Ingresa tu celular para entrar.</p>
      <div id="goti-step-phone">
        <label>Celular</label>
        <input type="tel" id="goti-phone" placeholder="10 dígitos" maxlength="10" inputmode="numeric">
        <div class="err" id="goti-err-phone"></div>
        <button id="goti-btn-phone">Continuar</button>
      </div>
      <div id="goti-step-pin" style="display:none;">
        <label id="goti-pin-label">Tu clave de 4 dígitos</label>
        <input type="password" id="goti-pin" maxlength="4" inputmode="numeric">
        <div id="goti-pin-confirm-wrap" style="display:none;">
          <label>Confirma tu clave</label>
          <input type="password" id="goti-pin-confirm" maxlength="4" inputmode="numeric">
        </div>
        <div class="err" id="goti-err-pin"></div>
        <button id="goti-btn-pin">Entrar</button>
        <button class="back" id="goti-btn-back">← usar otro número</button>
      </div>
    </div>
  `;
  document.documentElement.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const stepSub = document.getElementById("goti-step-sub");
  const stepPhone = document.getElementById("goti-step-phone");
  const stepPin = document.getElementById("goti-step-pin");
  const phoneInput = document.getElementById("goti-phone");
  const pinInput = document.getElementById("goti-pin");
  const pinConfirmWrap = document.getElementById("goti-pin-confirm-wrap");
  const pinConfirmInput = document.getElementById("goti-pin-confirm");
  const pinLabel = document.getElementById("goti-pin-label");
  const errPhone = document.getElementById("goti-err-phone");
  const errPin = document.getElementById("goti-err-pin");
  const btnPhone = document.getElementById("goti-btn-phone");
  const btnPin = document.getElementById("goti-btn-pin");
  const btnBack = document.getElementById("goti-btn-back");

  let currentPhone = null;
  let isNewPin = false;

  function onlyDigits(el){ el.value = el.value.replace(/\D/g, ""); }
  phoneInput.addEventListener("input", ()=> onlyDigits(phoneInput));
  pinInput.addEventListener("input", ()=> onlyDigits(pinInput));
  pinConfirmInput.addEventListener("input", ()=> onlyDigits(pinConfirmInput));

  btnPhone.addEventListener("click", async ()=>{
    errPhone.textContent = "";
    const phone = phoneInput.value.trim();
    if(phone.length !== 10){ errPhone.textContent = "Escribe tus 10 dígitos."; return; }
    btnPhone.disabled = true; btnPhone.textContent = "Revisando…";
    try{
      const { data, error } = await authSb.rpc("check_phone", { p_phone: phone });
      if(error) throw error;
      if(!data.exists){
        errPhone.textContent = "Este número no está autorizado.";
        return;
      }
      currentPhone = phone;
      isNewPin = !data.has_pin;
      stepPhone.style.display = "none";
      stepPin.style.display = "block";
      if(isNewPin){
        stepSub.textContent = "Primera vez — crea tu clave de 4 dígitos.";
        pinLabel.textContent = "Crea tu clave de 4 dígitos";
        pinConfirmWrap.style.display = "block";
      } else {
        stepSub.textContent = "Ingresa tu clave.";
        pinLabel.textContent = "Tu clave de 4 dígitos";
        pinConfirmWrap.style.display = "none";
      }
      pinInput.value = ""; pinConfirmInput.value = "";
      setTimeout(()=> pinInput.focus(), 50);
    }catch(err){
      console.error(err);
      errPhone.textContent = "No se pudo verificar, intenta de nuevo.";
    }finally{
      btnPhone.disabled = false; btnPhone.textContent = "Continuar";
    }
  });

  btnBack.addEventListener("click", ()=>{
    stepPin.style.display = "none";
    stepPhone.style.display = "block";
    errPin.textContent = "";
    currentPhone = null;
  });

  btnPin.addEventListener("click", async ()=>{
    errPin.textContent = "";
    const pin = pinInput.value.trim();
    if(!/^\d{4}$/.test(pin)){ errPin.textContent = "La clave debe ser de 4 dígitos."; return; }

    if(isNewPin){
      const confirmPin = pinConfirmInput.value.trim();
      if(pin !== confirmPin){ errPin.textContent = "Las claves no coinciden."; return; }
      btnPin.disabled = true; btnPin.textContent = "Guardando…";
      try{
        const { data, error } = await authSb.rpc("set_pin", { p_phone: currentPhone, p_pin: pin });
        if(error) throw error;
        if(!data.success){
          errPin.textContent = data.error === "already_set" ? "Ya tienes clave — usa esa." : "No se pudo crear la clave.";
          if(data.error === "already_set"){ isNewPin = false; pinConfirmWrap.style.display = "none"; pinLabel.textContent = "Tu clave de 4 dígitos"; }
          return;
        }
        finishLogin(data.initials);
      }catch(err){
        console.error(err);
        errPin.textContent = "No se pudo crear la clave, intenta de nuevo.";
      }finally{
        btnPin.disabled = false; btnPin.textContent = "Entrar";
      }
      return;
    }

    btnPin.disabled = true; btnPin.textContent = "Entrando…";
    try{
      const { data, error } = await authSb.rpc("verify_login", { p_phone: currentPhone, p_pin: pin });
      if(error) throw error;
      if(!data.success){
        if(data.error === "locked"){
          errPin.textContent = "Demasiados intentos — espera 15 minutos.";
        } else {
          errPin.textContent = "Clave incorrecta.";
        }
        return;
      }
      finishLogin(data.initials);
    }catch(err){
      console.error(err);
      errPin.textContent = "No se pudo entrar, intenta de nuevo.";
    }finally{
      btnPin.disabled = false; btnPin.textContent = "Entrar";
    }
  });

  function finishLogin(initials){
    localStorage.setItem(AUTH_KEY, initials);
    window.GOTI_USER = initials;
    document.body.style.overflow = "";
    overlay.remove();
    window.dispatchEvent(new CustomEvent("goti-authenticated", { detail: initials }));
  }
})();
