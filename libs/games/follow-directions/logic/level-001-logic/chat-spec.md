In this chat, we are going to brainstorm level 001 of my game
The game's purpose is to determine which user can best follow directions
 The game's secondary purpose is to teach people how to program and how xstate flavored state machines work to enable ubiquitous logic across different platforms and frameworks

The first level will simply display a title saying level 001
The goal of the level is for the user to sit completely still for some amount of time-3 seconds will work
The application should detect any interaction from the user with the page
focus, unfocus
mouse movements
keyboard clicks, etc, anything else I'm not thinking of 

let's first write unit tests against our machines to 
test that all interactions will reset the countdown to 
3 seconds and that after 3 seconds of not interacting 
with the screen at all and allowing our application to 
remain focused, the game level machine transitions to 
the completed succesfully state with the reason "you 
were able to remain still for 3 seconds"

---
