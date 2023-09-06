# AI explainer (for teaching AI to law students)

 - This is an interactive tool designed to help students build intuitions about AIs.
 - Before using this tool, I recommend watching [this short course on AI](https://www.3blue1brown.com/topics/neural-networks). The tool uses the same data and visual metaphors as the course.

## What's going on?

At a high level:
 - This is a hardwriting recognition AI. It uses a dataset of handwritten numbers.
 - Each handwriting sample is encoded as 786 numbers between from -1 to 1, which I display as a grid, with -1 as black and 1 as white.
 - The AI guesses what number is written by outputting ten numbers in the last layer. The closer to 1 the final value, the more the machine thinks that's the handwritten number.

Inside the AI:
 - each "layer" takes a weighted average of the numbers in the previous grid. Green denotes a positive weight, red denotes a negative weight.
 - The value of the average is denoted by the brightness of the border. Again, black is -1, white is 1.
   - For example, the default layout looks like this:
     - There are 768 numbers in the input layer.
     - The first layer takes 8 different weighted averages of those 786 numbers (the green and red squares).
     - The second layer takes 8 different weighted averages of the values in the first layer.
     - The outputs are 10 weighted averages of the values in the second layer.
  - The number above the handwriting sample is the number that the handwriting doner was asked to write.

Training the AI:
  - "training" an AI is a process of iteratively updating the weights in the network. The videos linked above and the implementation discussion below explain this process in more detail.

The buttons: 
  - You can edit the handwritten number using the "draw mode" and "erase mode" toggle.
  - The "available digits" buttons restricts the training data to contain only certain handwritten digits.
  - The "train on multiple images" buttons will update the weights in the network using a random sample from the training data.
  - The "train on a single image" button will intentionally overfit on whatever image is currently on the screen.
  - The "adjust network layout" button will change the number of layers and the size of each layer. The input is a comma-separated list of numbers.
  - The blank rectangle is for use explaining auto-encoders, I explain it more further down.
  - The "restore checkpoints" buttons will restore network and training states you saved. You may need to refresh the page after restoring a checkpoint.

## Setup

 - The tool runs entirely in your browser. That means you'll need to train the model using the same computer and browser that you'll be using for the demo.
 - If you email me, I can set up a mechanism for importing and exporting saved networks and pre-train some good examples.


## Concepts to demonstrate with the tool.

### Basic neural net training intuitions

 - click "train(100M)". As the weights update, the tool gradually gets better at recognizing numbers.
 - You can pause to look at individual numbers.

Things to try:
 - point out "shapes" emerging in the static. For example, a few boxes almost always get donut shape, which means the AI is learning to look for a "hole" in the number.
   - ![Screen Shot 2023-09-06 at 16 59 56](https://github.com/davidbstein/nn_explainer.stein.fyi/assets/1490241/00e17e32-8497-483a-8030-830c9afe145d)
 - hit "load random image" until you get a 4 or a 9.
   - Show how adding a "tail" (extending the horizontal line through the vertical line) makes a number more 4-like, and how adding a "hat" makes it more 9-like.
   - See if you can figure out which neurons are sensitive to tails and hats. Note how even though you can tell what they're looking for, the green and red static is rather inscrutable.
     - ![Screen Shot 2023-09-06 at 16 56 52](https://github.com/davidbstein/nn_explainer.stein.fyi/assets/1490241/0dcad630-d3b6-44aa-953c-117c619f4d33)
     - ![Screen Shot 2023-09-06 at 16 57 19](https://github.com/davidbstein/nn_explainer.stein.fyi/assets/1490241/85396e4e-1e09-46c8-81b8-5565dd3eab62)
     - ![Screen Shot 2023-09-06 at 16 57 51](https://github.com/davidbstein/nn_explainer.stein.fyi/assets/1490241/4740055a-89cd-4fa8-8f69-7b17119b9f07)
 - "train on a single image" and notice how the AI only gives one answer now, regardless of input.
 - train on a subset of numbers, and show how the AI never guesses numbers it's never been shown.

**Disucssion points** 
 - There's information about handwriting in those weights (e.g., different ways to represent the same number, margin of error for human writing).
 - Even if we can't read that information, the weights have information about the world. It's hard to know exactly what. Was the letter "a" in the training set? Could we figure that out?
    - Great opportunity to segway into privacy and copyright discussion.

### Transfer learning.

Experiment 1:
 - train a small net (try 4,4) on a subset of digits.
 - add some more layers (try 8,8) and some new digits.
 - The AI learns the new digits faster!
 - The "old" AI handles the digits it already knows.

Experiment 2:
 - train a big AI (say, 8,8,8) on all digits
 - shrink the later layers (try 8,2) on two digits
 - the AI learns quickly (because the layers already know what to look for)

Experiment 3:
 - train an AI on odd numbers
 - Train the AI on even numbers
 - the AI learns quickly, because only the last layer needs to change.

**Discussion points:**
  - There's a geneology of different models: few start entirely from scratch. Many have broken chains of custody, or start with big open-source projects. And the cost of re-training is prohibitive.
  - What does that mean for liability and culpability?

### Autoencoding

In preparing to talk about how AIs turn words into points in space, it's useful to build an encoder.

  - set up a network with a "pinch point" (try: 8,5,2,4,7)
    - ![Screen Shot 2023-09-06 at 16 52 29](https://github.com/davidbstein/nn_explainer.stein.fyi/assets/1490241/d70ce8a5-a1ea-4000-bb1c-72b5ea68653d)
  - before training, click the "add 100" and "resample" buttons at the bottom of the page. Set the "2D/3D" toggle to "2D"
    - This display shows a random sample of 100 handwriting samples, and draws them at the (x,y) coordinates corresponsing to the value of the 2-high layer.
    - "resample" will continuously update the sample.
      - ![Screen Shot 2023-09-06 at 16 35 02](https://github.com/davidbstein/nn_explainer.stein.fyi/assets/1490241/2aa76bfb-f808-4f98-83a6-1a6ab9ca6028)
  - starting training on multiple images.
    - note how the numbers  slowly clump together. (because the network needs to somehow encode the difference between numbers)
      - ![Screen Shot 2023-09-06 at 16 47 54](https://github.com/davidbstein/nn_explainer.stein.fyi/assets/1490241/3f4b9bcf-3f8c-4e31-b1c0-dc9ccfe79573)

   
This is how autoencoding works! I train the AI to recognize numbers, but I only retain the neurons leading up to the pinch point.
 - (If you did the transfer learning section) discuss how an encoder could be used in transfer learning to support more complex tasks
 - If you are digging into generative AI, note that some GPTs train the same "before the pinch" on several different "after the pinch" networks.

**Discussion points**
 - Training a single section of a network on several different tasks might cause it to store more sophisticated information in its weights, and allow it support more complex tasks.
 - (There is a similar "decoder" concept, but this demo tool isn't set up to do that very well)
 - What counts a "copying" in this case? What rises to the level of a privacy issue?
 - Do we want AIs components to be able to recognize harmful things (so finished products can avoid them), or does that create a risk of misuse?
