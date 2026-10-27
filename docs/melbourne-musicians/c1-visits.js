// One module evaluation per document. No gameplay hooks, storage or polling.
export function formatVisits(total){
 if(!Number.isSafeInteger(total)||total<0)return '---,---';
 return String(total).padStart(6,'0').replace(/\B(?=(\d{3})+(?!\d))/g,',');
}
