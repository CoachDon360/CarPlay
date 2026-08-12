const salesPrice=document.getElementById("salesPrice");
const commissionRate=document.getElementById("commissionRate");
const companyGrossEl=document.getElementById("companyGross");
const transactionFeeEl=document.getElementById("transactionFee");
const agentGrossEl=document.getElementById("agentGross");
const givingEl=document.getElementById("giving");
const taxesEl=document.getElementById("taxes");
const agentNetEl=document.getElementById("agentNet");
const clearButton=document.getElementById("clearButton");

const money=new Intl.NumberFormat("en-US",{
  style:"currency",
  currency:"USD",
  minimumFractionDigits:2,
  maximumFractionDigits:2
});

function getTransactionFee(companyGross){
  if(companyGross<=250)return 0;
  if(companyGross<=2500)return 50;
  if(companyGross<=5000)return 185;
  if(companyGross<=10000)return 260;
  if(companyGross<=25000)return 335;
  return 435;
}

function roundUpToNearestFive(amount){
  return Math.ceil(amount/5)*5;
}

function calculate(){
  const price=Number(salesPrice.value)||0;
  const rate=Number(commissionRate.value)||0;

  const companyGross=price*(rate/100);
  const transactionFee=getTransactionFee(companyGross);
  const agentGross=Math.max(0,companyGross*0.70-transactionFee);
  const giving=roundUpToNearestFive(agentGross*0.10);
  const taxes=agentGross*0.37;
  const agentNet=agentGross*0.63-giving;

  companyGrossEl.textContent=money.format(companyGross);
  transactionFeeEl.textContent=money.format(transactionFee);
  agentGrossEl.textContent=money.format(agentGross);
  givingEl.textContent=money.format(giving);
  taxesEl.textContent=money.format(taxes);
  agentNetEl.textContent=money.format(agentNet);
}

salesPrice.addEventListener("input",calculate);
commissionRate.addEventListener("input",calculate);
clearButton.addEventListener("click",()=>{
  salesPrice.value="";
  commissionRate.value="";
  calculate();
  salesPrice.focus();
});
calculate();
