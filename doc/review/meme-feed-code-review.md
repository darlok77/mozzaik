# Issues
you wait for each call to finish before loading, Currently, the requests are executed sequentially in for loops for the meme, author and comment which causes a significant number of loops

# Solutions

to improve this it would be necessary to launch several requests in parallel, and display the rendering of the requests already successful  

the api takes a page value so you have to initialize the page 1 and do each page up to the last one each time you scroll to the last in view
