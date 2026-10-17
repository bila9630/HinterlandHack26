// Python's random.Random(seed) for an integer seed (Mersenne Twister), so the tree belts land
// exactly where generate_scene.py put them.
export function pythonRandom(seed: number) {
  const N = 624;
  const mt = new Uint32Array(N);
  let index = N;

  mt[0] = 19650218;
  for (let i = 1; i < N; i++) mt[i] = (Math.imul(1812433253, mt[i - 1] ^ (mt[i - 1] >>> 30)) + i) >>> 0;
  // init_by_array with the seed as a single 32-bit word.
  const key = [seed >>> 0];
  let i = 1;
  let j = 0;
  for (let k = Math.max(N, key.length); k > 0; k--) {
    mt[i] = ((mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1664525)) + key[j] + j) >>> 0;
    i++;
    j++;
    if (i >= N) {
      mt[0] = mt[N - 1];
      i = 1;
    }
    if (j >= key.length) j = 0;
  }
  for (let k = N - 1; k > 0; k--) {
    mt[i] = ((mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1566083941)) - i) >>> 0;
    i++;
    if (i >= N) {
      mt[0] = mt[N - 1];
      i = 1;
    }
  }
  mt[0] = 0x80000000;

  function next() {
    if (index >= N) {
      for (let k = 0; k < N; k++) {
        const y = (mt[k] & 0x80000000) | (mt[(k + 1) % N] & 0x7fffffff);
        mt[k] = mt[(k + 397) % N] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      index = 0;
    }
    let y = mt[index++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  const random = () => ((next() >>> 5) * 67108864 + (next() >>> 6)) / 9007199254740992;
  const uniform = (a: number, b: number) => a + (b - a) * random();
  return { random, uniform };
}
