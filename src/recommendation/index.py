import sys, os, math
bot, top = int(sys.argv[1]), int(sys.argv[2])
size = math.ceil((top-bot)/0xff)
print(math.floor((int.from_bytes(os.urandom(size), "big")/(256**size))*(top-bot))+bot)