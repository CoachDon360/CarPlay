const content={
bathroom:["Bathroom selected","The next phase will show the next two or three A+ to A bathroom stops ahead."],
food:["Food selected","The next phase will rank upcoming interstate exits using strong restaurant and shopping signals."],
superchargers:["Superchargers selected","The next phase will compare upcoming Supercharger stops by nearby food, restrooms, and shopping."]
};
const cards=document.querySelectorAll("[data-purpose]");
const title=document.getElementById("title");
const copy=document.getElementById("copy");
cards.forEach(card=>card.addEventListener("click",()=>{
cards.forEach(c=>c.classList.remove("active"));
card.classList.add("active");
const [t,c]=content[card.dataset.purpose];
title.textContent=t;copy.textContent=c;
}));
