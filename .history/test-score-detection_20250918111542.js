// Test de la logique de détection des scores
const testLinks = [
  "renc_id=4991566&is_retour=0&phase=1&res_1=8&res_2=5&equip_1=BETHUNE+ASTT+1&equip_2=SQY+PING+1&equip_id1=1553&equip_id2=1808&clubnum_1=07620067&clubnum_2=08781477",
  "renc_id=4993011&is_retour=0&phase=1&res_1=8&res_2=4&equip_1=SQY+PING+1&equip_2=PARIS+13+TT+1&equip_id1=16932&equip_id2=1442&clubnum_1=08781477&clubnum_2=08751163",
  "renc_id=5079339&is_retour=0&phase=1&res_1=&res_2=&equip_1=SP.+PARIS+20+TT+1&equip_2=DUCKS+BONDOUFLE+2&equip_id1=4365&equip_id2=4763&clubnum_1=08751061&clubnum_2=08910667"
];

function testScoreDetection(lien) {
  const res1Match = lien.match(/res_1=([^&]+)/);
  const res2Match = lien.match(/res_2=([^&]+)/);
  const hasScore = res1Match && res2Match && res1Match[1] && res2Match[1];
  
  console.log(`Lien: ${lien}`);
  console.log(`res_1: ${res1Match ? res1Match[1] : 'null'}`);
  console.log(`res_2: ${res2Match ? res2Match[1] : 'null'}`);
  console.log(`Has score: ${hasScore}`);
  console.log('---');
}

testLinks.forEach(testScoreDetection);
