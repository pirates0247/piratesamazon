import dayjs from "https://unpkg.com/dayjs@1.11.10/esm/index.js";

export let deliveryOptions = [
  {
    id: '1',
    deliveryDays: 7,
    rupees: 0
  },
  {
    id: '2',
    deliveryDays: 3,
    rupees: 499
  },
  {
    id: '3',
    deliveryDays: 1,
    rupees: 999
  }
];
//export default deliveryOptions

export function getDeliveryOption(deliveryOptionId) {

  let deliveryOption;
  deliveryOptions.forEach((option) => {
    if(option.id === deliveryOptionId){
      deliveryOption = option;
    }
  });
  return deliveryOption || deliveryOptions[0];
}

function isWeekend(today) {
  const dayOfWeek = today.format('dddd');
  return dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';
}

export function calculateDeliveryDate(deliveryOption) {
  let remainingDays = deliveryOption.deliveryDays; 
  let deliveryDate = dayjs();

  while(remainingDays > 0){
    deliveryDate = deliveryDate.add(1, 'day');
    
    if(!isWeekend(deliveryDate)){
      remainingDays--;
    }
  }

  let dateString = deliveryDate.format('dddd, MMMM D, YYYY');
  return dateString;
}