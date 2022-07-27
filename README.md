# simpleparser

A very simple parser made with the knowledge acquired through the course `04138 - LINGUAGGI DI PROGRAMMAZIONE`

Sample execution

`node index.js`

```
[-] Enter the grammar
[?] > S->a A B|b S
[?] > A->a
[?] > B->b
[?] >
[-] First
	S => a,b
	A => a
	B => b
[-] Follow
	S => $
	A => b
	B => $
[-] Parsing table LL1
		|	a	||	b	|
	S	|	a,A,B	||	b,S	|
	A	|	a	||		|
	B	|		||	b	|

[?] String to be recognized (every token separated by { })
> b b b a a b
[-] String (b b b a a b) recognized by LL1 parser
```
