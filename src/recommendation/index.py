import sys, os, math
min, max = int(sys.argv[1]), int(sys.argv[2])
size = math.ceil((max-min)/0xff)
print(math.floor((int.from_bytes(os.urandom(size), "big")/(0xff**size))*(max-min))+min)