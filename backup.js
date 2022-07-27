const fs = require("fs");

const TOKEN_DELIMITER = " ";
const EPS = "ε";
const ARROW = "->";
const PRODS_DELIMITER = "|";
const START_SYMBOL = "S";
const END_MARKER = "$";
const ERROR_ARROW_SYMBOL = "Numero di simboli speciali '->' errato";
const ERROR_NO_PROD = "Nessuna produzione trovata";

function parseInputSingleHead(input) {
  input = input.trim();
  let splits = input.split(ARROW);
  if (splits.length != 2) {
    throw ERROR_ARROW_SYMBOL;
  }

  let head = splits[0];
  let prods_raw = splits[1].split(PRODS_DELIMITER);
  if (prods_raw.length == 0) {
    throw ERROR_NO_PROD;
  }
  let prods = [];
  for (let i = 0; i < prods_raw.length; i++) {
    let tokens = prods_raw[i].split(TOKEN_DELIMITER);
    prods.push(tokens);
  }
  let NT = { head, prods };
  return NT;
}

function contains(list, token) {
  if (Array.isArray(token)) {
    for (let i = 0; i < token.length; i++) {
      if (!contains(list, token[i])) return false;
    }
    return true;
  }

  for (let i = 0; i < list.length; i++) {
    let eq = true;
    if (Array.isArray(list[i])) {
      if (list[i].length == token.length) {
        for (let j = 0; j < list[i].length; j++) {
          if (list[i][j] != token[j]) eq = false;
        }
      } else eq = false;
      if (eq) return true;
    } else {
      if (list[i] == token) {
        return true;
      }
    }
  }

  return false;
}

function union(A, B) {
  for (let i = 0; i < B.length; i++) {
    if (!A.includes(B[i])) A.push(B[i]);
  }
  return A;
}

function unionNoEps(A, B) {
  for (let i = 0; i < B.length; i++) {
    if (!A.includes(B[i]) && B[i] != EPS) A.push(B[i]);
  }
  return A;
}

function findNT(heads) {
  let NT = [];
  for (let i = 0; i < heads.length; i++) {
    if (!contains(NT, heads[i].head)) NT.push(heads[i].head);
  }
  return NT;
}

function findT(heads, NT) {
  let T_ = [];
  for (let i = 0; i < heads.length; i++) {
    let prods = heads[i].prods;
    for (let j = 0; j < prods.length; j++) {
      // every symbol is one char
      for (let k = 0; k < prods[j].length; k++) {
        if (!contains(NT, prods[j][k]) && !contains(T_, prods[j][k]))
          T_.push(prods[j][k]);
      }
    }
  }
  return T_;
}

function parseInput(input) {
  let lines = input.split("\n");
  if (lines.length == 0) throw ERROR_NO_PROD;
  let heads = [];
  for (let i = 0; i < lines.length; i++) {
    heads.push(parseInputSingleHead(lines[i]));
  }
  let NT = findNT(heads);
  let T = findT(heads, NT);
  let R = {};
  for (let i = 0; i < heads.length; i++) {
    R[heads[i].head] = heads[i].prods;
  }
  let G = { NT, T, R: R, S: START_SYMBOL };
  return G;
}

// N(G) = { A in NT | A =>* eps }
function findNullable(G) {
  let N = [];
  // level 0
  Object.keys(G.R).forEach((head) => {
    if (contains(G.R[head], EPS)) {
      N.push(head);
    }
  });

  // level i >= 1
  let updated = false;
  do {
    updated = false;
    Object.keys(G.R).forEach((head) => {
      let prods = G.R[head];
      for (let j = 0; j < prods.length; j++) {
        if (contains(N, head)) break;
        let is_nullable = true;
        for (let k = 0; k < prods[j].length; k++) {
          if (!contains(N, prods[j][k])) {
            is_nullable = false;
            break;
          }
        }
        if (is_nullable) {
          updated = true;
          N.push(head);
        }
      }
    });
  } while (updated);

  return N;
}

let rep = 0;
function findFirstSingleHead(G, N, head, history, parent) {
  if (rep++ > 20) return {};
  if (!history) history = [];
  if (contains(history, head)) return {};
  history.push(head);
  console.log(history);
  console.log(`Cerco i first di ${head}`);
  if (G.T.includes(head) || head === EPS) return [head];
  let First = {};
  First[head] = [];
  let updated = false;
  // do {
  updated = false;
  if (G.R[head]) {
    let prods = G.R[head];
    for (let j = 0; j < prods.length; j++) {
      console.log(`Prods ${j} di ${head} da ${parent}`);
      console.log(prods[j]);
      for (let k = 0; k < prods[j].length; k++) {
        if (contains(history, prods[j][k])) continue;
        console.log(`Ricorsione su ${prods[j][k]} da ${head}`);
        let first_ = findFirstSingleHead(G, N, prods[j][k], history, head);
        console.log(`Ricorsione terminata su ${prods[j][k]} da ${head}`);
        console.log(first_);
        console.log("");
        // if (contains(G.NT, prods[j][k]) && First[prods[j][k]] == undefined)
        First[prods[j][k]] = [];
        for (let l = 0; l < first_.length; l++) {
          if (first_[l] !== EPS && !contains(First[prods[j][k]], first_[l])) {
            updated = true;
            First[prods[j][k]].push(first_[l]);
          }
        }
        if (!contains(N, prods[j][k])) {
          break;
        }
      }
    }
  }
  // } while (updated);

  if (contains(N, head)) First[head].push(EPS);

  return First;
}

function findFirstMultiHead(G, N, heads) {
  let First = [];

  let contains_eps = true;
  for (let i = 0; i < heads.length; i++) {
    First = unionNoEps(First, findFirstSingleHead(G, N, heads[i]));
    // if it is not nullable
    if (!contains(N, heads[i])) {
      contains_eps = false;
      break;
    }
  }

  if (contains_eps) First = union(First, [EPS]);

  return First;
}

function findFirst(G) {
  let First = {};
  let N = findNullable(G);
  for (let i = 0; i < G.NT.length; i++) {
    let first = findFirstSingleHead(G, N, G.NT[i]);
    First[G.NT[i]] = first;
    break;
  }

  return First;
}

function findFollow(G) {
  let Follow = {};
  let N = findNullable(G);
  Follow[START_SYMBOL] = [END_MARKER];

  let updated = false;
  do {
    updated = false;
    Object.keys(G.R).forEach((head) => {
      let prods = G.R[head];
      for (let i = 0; i < prods.length; i++) {
        for (let j = 0; j < prods[i].length; j++) {
          let p = prods[i][j];
          if (contains(G.NT, p)) {
            if (Follow[p] == undefined) Follow[p] = [];
            let s = prods[i].slice(j + 1);
            let firstNext = findFirstMultiHead(G, N, s);
            for (let k = 0; k < firstNext.length; k++) {
              if (!contains(Follow[p], firstNext[k]) && firstNext[k] !== EPS) {
                updated = true;
                Follow[p].push(firstNext[k]);
              }
            }
            // Follow[p] = unionNoEps(Follow[p], firstNext);
            if (firstNext.includes(EPS) || j == prods[i].length - 1) {
              if (Follow[head] == undefined) Follow[head] = [];
              for (let k = 0; k < Follow[head].length; k++) {
                if (!contains(Follow[p], Follow[head][k])) {
                  updated = true;
                  Follow[p].push(Follow[head][k]);
                }
              }
              // Follow[p] = union(Follow[p], Follow[head]);
            }
          }
        }
      }
    });
  } while (updated);

  return Follow;
}

function test() {
  let input = `S->A|A a|b
                A->a|${EPS}
                B->A|C
                D->A B S ciao`;
  input = ` S->A B C
            A->a a A|${EPS}
            B->b|${EPS}
            C->c C|${EPS}`;
  input = ` S->T E'
            E'->${EPS}|+ S|- S
            T->A T'
            T'->${EPS}|* T
            A->a|b|( S )`;
  input = ` S->a A B
            A->C|D
            B->b
            C->c|${EPS}
            D->d`;
  input = ` S->A B|C|a E
            A->${EPS}|a S B
            B->a|b B C
            C->A|C d
            D->c|d S
            E->a D E`;
  let G = parseInput(input);
  console.log(G);
  let first = findFirst(G);
  console.log("FIRST");
  console.log(first);
  // let follow = findFollow(G);
  // console.log("FOLLOW");
  // console.log(follow);
}

test();
