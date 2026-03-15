export function formatMoney(amount){

  const value = Number(amount) || 0

  return new Intl.NumberFormat("en-MW",{
    style:"currency",
    currency:"MWK",
    minimumFractionDigits:0
  }).format(value)

}
