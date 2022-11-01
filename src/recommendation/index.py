import sys
from random import randint, seed
from time import time
seed(time())
print(randint(*[int(i) for i in sys.argv[1:3]]))