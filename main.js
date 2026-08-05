(function(){
  const S=window.SCHOOL||{};
  document.querySelectorAll("[data-phone]").forEach(el=>{if(el.dataset.phone==="label")el.textContent=S.phone;else if(!el.querySelector("*"))el.textContent=S.phone;if(el.tagName==="A")el.href="tel:"+S.phone;});
  document.querySelectorAll("[data-email]").forEach(el=>{if(!el.querySelector("*"))el.textContent=S.email;if(el.tagName==="A")el.href="mailto:"+S.email;});
  document.querySelectorAll("[data-address]").forEach(el=>{el.textContent=S.address;});
  document.querySelectorAll("[data-year]").forEach(el=>{el.textContent=new Date().getFullYear();});
  const wa="https://wa.me/"+(S.whatsapp||"")+"?text="+encodeURIComponent("Hello, I would like to know more about admissions at "+(S.name||"your school")+".");
  document.querySelectorAll("[data-whatsapp]").forEach(el=>{el.href=wa;});
  const t=document.querySelector(".nav-toggle"),l=document.querySelector(".nav-links");
  if(t&&l){t.addEventListener("click",()=>{t.classList.toggle("open");l.classList.toggle("open");});l.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{t.classList.remove("open");l.classList.remove("open");}));}
  const here=location.pathname.split("/").pop()||"index.html";
  document.querySelectorAll(".nav-links a").forEach(a=>{if(a.getAttribute("href")===here)a.classList.add("active");});
  let lb=document.querySelector(".lightbox");
  if(!lb){lb=document.createElement("div");lb.className="lightbox";lb.innerHTML='<span class="close">&times;</span><img alt="View">';document.body.appendChild(lb);lb.addEventListener("click",()=>lb.classList.remove("open"));}
  const li=lb.querySelector("img");
  document.querySelectorAll("[data-zoom],[data-lightbox]").forEach(el=>{el.addEventListener("click",()=>{const s=el.getAttribute("data-zoom")||el.getAttribute("data-lightbox")||el.querySelector("img")?.src;if(s){li.src=s;lb.classList.add("open");}});});
  document.querySelectorAll("form[data-sheet-form]").forEach(form=>{form.addEventListener("submit",ev=>{ev.preventDefault();
    const msg=form.querySelector(".form-msg");const data=Object.fromEntries(new FormData(form).entries());data.formType=form.getAttribute("data-sheet-form");
    const show=(t,m)=>{if(msg){msg.className="form-msg "+t;msg.textContent=m;msg.scrollIntoView({behavior:"smooth",block:"center"});}};
    const sum=Object.entries(data).filter(([k])=>k!=="formType").map(([k,v])=>k+": "+v).join("%0A");
    show("ok","Thank you! Opening WhatsApp so you can send us these details directly.");
    window.open("https://wa.me/"+(S.whatsapp||"")+"?text="+encodeURIComponent(data.formType+" enquiry%0A")+sum,"_blank");form.reset();});});
})();
