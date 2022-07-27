const fs = require("fs");
const reader = require("readline-sync");

const TOKEN_DELIMITER = " ";
const EPS = "ε";
const ARROW = "->";
const PRODS_DELIMITER = "|";
const START_SYMBOL = "S";
const END_MARKER = "$";
const ERROR_ARROW_SYMBOL = "Number of special symbol '->' wrong";
const ERROR_NO_PROD = "No production found";
const ERROR_COLLISION = "Collision in the parsing table";
const ERROR_PARSER_LL1 = "String not recognized";
const ERROR_NO_SYMBOL = "Symbol not recognized";

function printLog(msg) {
  console.log(`[-] ${msg}`);
}

function printError(msg) {
  console.log(`[x] ${msg}`);
}

function askInput(msg) {
  return reader.question(`[?] ${msg}`);
}

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
        if (
          !contains(prods[j][k], EPS) &&
          !contains(NT, prods[j][k]) &&
          !contains(T_, prods[j][k])
        )
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

function findFirstSingleHead(G, N, head, history) {
  if (G.T.includes(head) || head === EPS) return [head];
  if (history == undefined) history = [];
  history.push(head);
  let First = [];
  let updated = false;
  do {
    updated = false;
    if (G.R[head]) {
      let prods = G.R[head];
      for (let j = 0; j < prods.length; j++) {
        for (let k = 0; k < prods[j].length; k++) {
          let p = prods[j][k];
          if (contains(history, p)) {
            // console.log(`RICORSIONE SINISTRA TROVATA : ${head}->${p}`);
            continue;
          }
          let first_ = findFirstSingleHead(G, N, p, [...history]);
          for (let l = 0; l < first_.length; l++) {
            if (first_[l] !== EPS && !contains(First, first_[l])) {
              updated = true;
              First.push(first_[l]);
            }
          }
          if (!contains(N, p)) {
            break;
          }
        }
      }
    }
  } while (updated);

  if (contains(N, head)) First.push(EPS);

  return First;
}

function findFirstMultiHead(G, N, heads) {
  let First = [];

  let contains_eps = true;
  for (let i = 0; i < heads.length; i++) {
    First = unionNoEps(First, findFirstSingleHead(G, N, heads[i]));
    // if it is not nullable
    if (!contains(N, heads[i]) && !contains(heads[i], EPS)) {
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
  }

  return First;
}

function findFirstAll(G) {
  let queue = [G.S];
  let First = {};

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

function is_empty(w) {
  if (w == undefined || w == null || w == "") return true;
  if (Array.isArray(w) && w.length == 0) return true;
  return false;
}

function parsingTableLL1(G) {
  let N = findNullable(G);
  // let First = findFirst(G);
  let Follow = findFollow(G);
  let M = {};
  let columns = {};
  for (let j = 0; j < G.T.length; j++) {
    columns[G.T[j]] = [];
  }
  columns[END_MARKER] = [];
  for (let i = 0; i < G.NT.length; i++) {
    M[G.NT[i]] = { ...columns };
  }
  Object.keys(G.R).forEach((head) => {
    let prods = G.R[head];
    for (let i = 0; i < prods.length; i++) {
      let first_ = findFirstMultiHead(G, N, prods[i]);
      for (let j = 0; j < first_.length; j++) {
        if (contains(first_[j], EPS)) continue;
        if (!is_empty(M[head][first_[j]])) {
          throw ERROR_COLLISION;
        }
        M[head][first_[j]] = [...prods[i]];
      }
      if (contains(first_, EPS)) {
        let follow_ = Follow[head];
        console.log(`SETTO NEI FOLLOW ${head} -----> ${follow_}`);
        for (let j = 0; j < follow_.length; j++) {
          if (!is_empty(M[head][follow_[j]])) {
            throw ERROR_COLLISION;
          }
          M[head][follow_[j]] = [...prods[i]];
        }
      }
    }
  });
  return M;
}

function top(stack) {
  return stack[stack.length - 1];
}

function parserLL1(G, w) {
  let M = parsingTableLL1(G);
  let stack = [END_MARKER, START_SYMBOL];
  let X = top(stack);
  w.push(END_MARKER);
  let ic = 0;
  while (X != END_MARKER) {
    if (contains(G.T, X)) {
      if (X == w[ic]) {
        ic++;
        stack.pop();
        X = top(stack);
      } else throw ERROR_PARSER_LL1;
    } else if (contains(G.NT, X)) {
      if (!is_empty(M[X][w[ic]])) {
        stack.pop();
        let prod = M[X][w[ic]];
        for (let i = prod.length - 1; i >= 0; i--) {
          stack.push(prod[i]);
        }
        X = top(stack);
      } else throw ERROR_PARSER_LL1;
    } else throw ERROR_NO_SYMBOL;
  }

  if (w[ic] != END_MARKER) throw ERROR_PARSER_LL1;
  return true;
}

function automaCanonicaLR0(G) {
  let stati = {};
  stati["S'"] = [{ prods: [".", "S"], trans: [] }];
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
  input = ` S->B A C|A
            A->a|b S D
            B->C|b D B
            C->${EPS}|C d
            D->c|d D`;
  input = ` S->A B|B C
            A->${EPS}|b D
            B->a|b C B
            C->${EPS}|C d
            D->c|d S D`;
  input = ` S->if C then O else O|O
            C->true|false
            O->print ( I )|alert ( I )
            I->a|b|c|d|e|f|g|h`;
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
  input = ` S->a A B|b S
            A->a
            B->b`;
  try {
    let G = parseInput(input);
    console.log(G);
    // let first = findFirst(G);
    // console.log("FIRST");
    // console.log(first);
    // let follow = findFollow(G);
    // console.log("FOLLOW");
    // console.log(follow);
    // let M = parsingTableLL1(G);
    // console.log("PARSING TABLE LL1");
    // console.log(M);
    parserLL1(G, ["b", "b", "b", "b", "a", "a", "b"]);
  } catch (e) {
    printError(e);
  }
}

function mostraDizionario(dict) {
  Object.keys(dict).forEach((head) => {
    console.log(`\t${head} => ${dict[head]}`);
  });
}

function mostraTable(G, table) {
  let output = "\t\t";
  for (let i = 0; i < G.T.length; i++) {
    output += `|\t ${G.T[i]}\t|`;
  }
  output += "\n";
  Object.keys(table).forEach((head) => {
    output += `\t${head}\t`;
    for (let i = 0; i < G.T.length; i++) {
      output += `|\t${table[head][G.T[i]]}\t|`;
    }
    output += "\n";
  });
  console.log(output);
}

function menu() {
  printLog("Enter the grammar ");
  let input = "";
  let line = "";
  do {
    line = askInput("> ");
    if (line != "") input += line + "\n";
  } while (line != "");
  input = input.trim();

  let G = parseInput(input);

  let first = findFirst(G);
  printLog("First");
  mostraDizionario(first);

  let follow = findFollow(G);
  printLog("Follow");
  mostraDizionario(follow);

  let M = parsingTableLL1(G);
  printLog("Parsing table LL1");
  mostraTable(G, M);

  let stringa = "";
  do {
    stringa = askInput(
      `String to be recognized (every token separated by {${TOKEN_DELIMITER}})\n> `
    );
    if (stringa == "") break;
    try {
      let rec = parserLL1(G, stringa.split(TOKEN_DELIMITER));
      if (rec) printLog(`String (${stringa}) recognized by LL1 parser\n`);
    } catch (e) {
      printError(`${e}\n`);
    }
  } while (stringa != "");
}

// test();
menu();
