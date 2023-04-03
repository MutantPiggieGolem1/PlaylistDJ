import sys
import os
from random import randint, seed
seed(os.urandom(24))
print(randint(*[int(i) for i in sys.argv[1:3]]))