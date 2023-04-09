import sys, os, math
min, max = int(sys.argv[1]), int(sys.argv[2])
size = math.floor((max-min)**0.4)
print(math.floor((int.from_bytes(os.urandom(size))/(0xff**size))*(max-min))+min)