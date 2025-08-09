export function scoreGuess(secret, guess) {
  secret = secret.toUpperCase(); guess = guess.toUpperCase();
  const res = Array(5).fill('gray'); const cnt={};
  for (let i=0;i<5;i++) cnt[secret[i]]=(cnt[secret[i]]||0)+1;
  for (let i=0;i<5;i++) if (guess[i]===secret[i]){res[i]='green';cnt[guess[i]]--;}
  for (let i=0;i<5;i++) if (res[i]==='gray' && cnt[guess[i]]>0){res[i]='yellow';cnt[guess[i]]--;}
  return res;
}
// export function isValidWord(word, wordlist){ if(!word) return false; const w=word.toUpperCase(); return /^[A-Z]{5}$/.test(w) && wordlist.includes(w); }
export function isValidWordLocal(word) {
  if (!word) return false;
  const w = word.toUpperCase();
  return /^[A-Z]{5}$/.test(w) && WORDSET.has(w);
}