# import tensorflow as tf
# import tensorflow_recommenders as tfrs
# import numpy as np;
# from typing import Dict, Text

# class MovielensModel(tfrs.Model):
#   def __init__(self, user_model, movie_model):
#     super().__init__()
#     self.movie_model: tf.keras.Model = movie_model
#     self.user_model: tf.keras.Model = user_model
#     self.task: tf.keras.layers.Layer = task

#   def compute_loss(self, features: Dict[Text, tf.Tensor], training=False) -> tf.Tensor:
#     # We pick out the user features and pass them into the user model.
#     user_embeddings = self.user_model(features["user_id"])
#     # And pick out the movie features and pass them into the movie model,
#     # getting embeddings back.
#     positive_movie_embeddings = self.movie_model(features["movie_title"])

#     # The task computes the loss and the metrics.
#     return self.task(user_embeddings, positive_movie_embeddings)

# # Load data on movie ratings.
# ratings = tfds.load("movielens/100k-ratings", split="train")
# movies = tfds.load("movielens/100k-movies", split="train")

# # Build flexible representation models.
# user_model = tf.keras.Sequential([...])
# movie_model = tf.keras.Sequential([...])

# # Define your objectives.
# task = tfrs.tasks.Retrieval(metrics=tfrs.metrics.FactorizedTopK(
#     movies.batch(128).map(movie_model)
#   )
# )

# # Create a retrieval model.
# model = MovielensModel(user_model, movie_model, task)
# model.compile(optimizer=tf.keras.optimizers.Adagrad(0.5))

# # Train.
# model.fit(ratings.batch(4096), epochs=3)

# # Set up retrieval using trained representations.
# index = tfrs.layers.ann.BruteForce(model.user_model)
# index.index_from_dataset(
#     movies.batch(100).map(lambda title: (title, model.movie_model(title)))
# )

# # Get recommendations.
# _, titles = index(np.array(["42"]))
# print(f"Recommendations for user 42: {titles[0, :3]}")

import sys
from random import randint, seed
import time
seed(time()) # that was the issue wasnt it.
print(randint(*[int(i) for i in sys.argv[1:3]]))