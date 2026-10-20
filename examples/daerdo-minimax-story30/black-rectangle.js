// Detects the historical solid 363x51 compositor rectangle, not isolated dark hair pixels.
// Depends on decoded PNG pixels; story DOM tests and encoded-frame CI share this predicate.
// Invariants: original ROI and RGB<8 candidate threshold; broad, consecutive filled rows required.
export function blackRectangle(p){
 let black=0,total=0,solidRows=0,rows=0,run=0,longestRun=0;
 for(let y=33;y<78;y+=2){let dark=0,count=0;
  for(let x=1520;x<1876;x+=2){const o=(y*p.width+x)*4;count++;total++;if(p.px[o]<8&&p.px[o+1]<8&&p.px[o+2]<8){dark++;black++}}
  rows++;if(dark/count>=.9){solidRows++;run++;longestRun=Math.max(longestRun,run)}else run=0;
 }
 return {black,total,fraction:black/total,solidRows,rows,longestRun,rectangle:longestRun/rows>=.8,roi:[1520,33,356,45]};
}
