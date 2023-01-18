# Collaberative Codemirror 6 Example with React, Sockets, and Typescript

This project is here to give a reference to anyone looking how to implement the collab package from the [Codemirror documentation](https://codemirror.net/examples/collab/), with sockets instead of a worker.

It is built with React and Typescript, but those can be easily striped out.

To start the code, look at the README.md's under backend and frontend.

## Implementing Shared Effects and Cursors
I have added shared cursors and highlighting which can be viewed in the `cursors` branch, it makes one change in the backend, and and few changes in the frontend to work. It is a great example of how to implement SharedEffects if that is what you want to do.

![cursors-demonstration](https://user-images.githubusercontent.com/75190918/212936222-0ee13f31-d8a3-4894-913a-201a90a82b20.gif)

## Multiple Documents hosted on Server
I also added the capability for multiple documents, which changes the fronted slightly to create a new key for the Codemirror component (otherwise the state creates an issue when not at a clean state), and changes the backend to allow editing multiple different documents. You can even read files and make documents for users to edit (I've done so already see [Pico-Online](https://github.com/BERDPhone/Pico-Online)).

![ezgif com-gif-maker copy](https://user-images.githubusercontent.com/75190918/213265954-b6b824d7-489a-4fd3-97be-cfb53534d4f8.gif)

## Support
If you have any questions, or other frameworks/languages you'd like help with implementing this on, feel free to create an issue. I'll see if I can help out.
