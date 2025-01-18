{
  "targets": [
    {
      "target_name": "stemhat",
      "sources": [ "stemhat.cc", "gpiolib.c", "util.c", "gpiochip_bcm2712.c", "gpiochip_bcm2835.c", "gpiochip_rp1.c"],
      "cflags": ["-fexceptions"],
      "cflags_cc": ["-fexceptions"],
    }
  ]
}
