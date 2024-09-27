you wait for each call to finish before loading, Currently, the requests are executed sequentially in for loops for the author and comment which causes a significant number of loops

you use math.ceil instead of math.round we want the upper integer to have the integer list of all the memes

the api takes a page value starting with 1 so you have to initialize the page to 1 and do each page up to the last one

to improve this it would be necessary to launch several requests in parallel, and display the rendering of the requests already successful