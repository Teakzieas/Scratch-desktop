#include <assert.h>
#include <node_api.h>
#include <stdlib.h>
#include <stdio.h>
#include <chrono>
#include <thread>

extern "C" {
#include "gpiolib.h"
}

int running = 0;


// Check if GPIO library is running
int is_running(){
    if(!running){
        int ret = gpiolib_init();
        if (ret < 0)
            return EXIT_FAILURE;

        // Check number of GPIO chips
        if (!ret)
            return EXIT_FAILURE;

        ret = gpiolib_mmap();
        if (ret)
            return EXIT_FAILURE;

        running = 1;
    }
    return EXIT_SUCCESS;
}

// Toggle gpio pin (sets as output first)
int toggle(int pinnum)
{
    if (is_running() == EXIT_FAILURE)
        return EXIT_FAILURE;

    gpio_set_fsel(pinnum, GPIO_FSEL_OUTPUT);
    gpio_set_pull(pinnum, PULL_NONE);

    int level = gpio_get_level(pinnum);
    level ^= 1;

    GPIO_DRIVE_T drive;
    drive = (level == 1) ? DRIVE_HIGH : DRIVE_LOW;
    gpio_set_drive(pinnum, drive);

    return EXIT_SUCCESS; 
}

// Set gpio pin to high or low (make pin output too)
int set(int pinnum, int level)
{
    if (is_running() == EXIT_FAILURE)
        return EXIT_FAILURE;

    gpio_set_fsel(pinnum, GPIO_FSEL_OUTPUT);
    gpio_set_pull(pinnum, PULL_NONE);

    GPIO_DRIVE_T drive;
    drive = (level == 1) ? DRIVE_HIGH : DRIVE_LOW;
    gpio_set_drive(pinnum, drive);

    return EXIT_SUCCESS; 
}

// Get gpio pin state (func decides whether to make pin an input/output, pu decides whether to make pin pullup/pulldown etc.)
int get(int pinnum, int func, int pull_mode)
{
    if (is_running() == EXIT_FAILURE)
        return EXIT_FAILURE;

    switch (func){
        case 1:
            gpio_set_fsel(pinnum, GPIO_FSEL_OUTPUT);
            break;
        case 0:
            gpio_set_fsel(pinnum, GPIO_FSEL_INPUT);
            break;
    }

    switch (pull_mode){
        case 2:
            gpio_set_pull(pinnum, PULL_UP);
            break;
        case 1:
            gpio_set_pull(pinnum, PULL_DOWN);
            break;
        case 0:
            gpio_set_pull(pinnum, PULL_NONE);
            break;
    }

    return gpio_get_level(pinnum);
}

// Set gpio pin pull mode (make pin input)
int pull(int pinnum, int pull_mode)
{

    if (is_running() == EXIT_FAILURE)
        return EXIT_FAILURE;

    gpio_set_fsel(pinnum, GPIO_FSEL_INPUT);
    switch (pull_mode){
        case 2:
            gpio_set_pull(pinnum, PULL_UP);
            break;
        case 1:
            gpio_set_pull(pinnum, PULL_DOWN);
            break;
        case 0:
            gpio_set_pull(pinnum, PULL_NONE);
            break;
    }

    return EXIT_SUCCESS; 
}


// Read ultrasonic sensor distance
int read_ultrasonic(int trig_pin, int echo_pin) {
    if (is_running() == EXIT_FAILURE)
        return EXIT_FAILURE;

    // Set trigger pin as output and echo pin as input
    gpio_set_fsel(trig_pin, GPIO_FSEL_OUTPUT);
    gpio_set_fsel(echo_pin, GPIO_FSEL_INPUT);
    gpio_set_pull(echo_pin, PULL_NONE);
    

    // Generate a 10-microsecond pulse on the trigger pin
    gpio_set_drive(trig_pin, DRIVE_LOW);
    std::this_thread::sleep_for(std::chrono::microseconds(1000));
    gpio_set_drive(trig_pin, DRIVE_HIGH);
    std::this_thread::sleep_for(std::chrono::microseconds(10));
    gpio_set_drive(trig_pin, DRIVE_LOW);

    // Wait for the echo pin to go high
    auto start_time = std::chrono::high_resolution_clock::now();
    auto end_time = start_time;
    
    
    while (gpio_get_level(echo_pin) == 0) {
        end_time = std::chrono::high_resolution_clock::now();
        if (std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time).count() > 300000) {
            return -1; // Timeout waiting for echo to go high
        }
    }

    // Measure the time the echo pin stays high
    start_time = std::chrono::high_resolution_clock::now();
    
    while (gpio_get_level(echo_pin) == 1) {
        end_time = std::chrono::high_resolution_clock::now();
        if (std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time).count() > 300000) {
            return -1; // Timeout waiting for echo to go low
        }
    }

    // Calculate the duration in microseconds
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time).count();

    // Calculate the distance in centimeters (speed of sound = 34300 cm/s)
    int distance = duration / 58; // Divide by 58 to convert to cm

    return distance;
}


// Node.js wrapper for read_ultrasonic function
napi_value ReadUltrasonic(napi_env env, napi_callback_info info) {
    napi_status status;

    size_t argc = 2;
    napi_value args[argc];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    assert(status == napi_ok);

    if (argc < 2) {
        napi_throw_type_error(env, nullptr, "Wrong number of arguments");
        return nullptr;
    }

    napi_valuetype trig_valuetype;
    napi_valuetype echo_valuetype;

    status = napi_typeof(env, args[0], &trig_valuetype);
    assert(status == napi_ok);

    status = napi_typeof(env, args[1], &echo_valuetype);
    assert(status == napi_ok);

    if (trig_valuetype != napi_number || echo_valuetype != napi_number) {
        napi_throw_type_error(env, nullptr, "Wrong arguments");
        return nullptr;
    }

    int trig_pin;
    int echo_pin;

    status = napi_get_value_int32(env, args[0], &trig_pin);
    assert(status == napi_ok);

    status = napi_get_value_int32(env, args[1], &echo_pin);
    assert(status == napi_ok);

    int distance = read_ultrasonic(trig_pin, echo_pin);

    napi_value n_distance;
    status = napi_create_int32(env, distance, &n_distance);
    assert(status == napi_ok);

    return n_distance;
}


// NodeJS GPIO toggle function
napi_value Toggle(napi_env env, napi_callback_info info) {
    napi_status status;

    size_t argc = 1;
    napi_value args[1];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    assert(status == napi_ok);

    if (argc < 1) {
        napi_throw_type_error(env, nullptr, "Wrong number of arguments");
        return nullptr;
    }

    napi_valuetype pin_valuetype;
    status = napi_typeof(env, args[0], &pin_valuetype);
    assert(status == napi_ok);

    if (pin_valuetype != napi_number) {
        napi_throw_type_error(env, nullptr, "Wrong arguments");
        return nullptr;
    }

    int pin;
    status = napi_get_value_int32(env, args[0], &pin);
    assert(status == napi_ok);

    int ret = toggle(pin);

    napi_value n_ret;
    status = napi_create_int32(env, ret, &n_ret);
    assert(status == napi_ok);

    return n_ret;
}

// NodeJS GPIO set function
napi_value Set(napi_env env, napi_callback_info info) {
    napi_status status;

    size_t argc = 2;
    napi_value args[argc];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    assert(status == napi_ok);

    if (argc < 2) {
        napi_throw_type_error(env, nullptr, "Wrong number of arguments");
        return nullptr;
    }

    napi_valuetype pin_valuetype;
    napi_valuetype drive_valuetype;

    status = napi_typeof(env, args[0], &pin_valuetype);
    assert(status == napi_ok);

    status = napi_typeof(env, args[1], &drive_valuetype);
    assert(status == napi_ok);

    if (pin_valuetype != napi_number || drive_valuetype != napi_number ) {
        napi_throw_type_error(env, nullptr, "Wrong arguments");
        return nullptr;
    }

    int pin;
    int drive;

    status = napi_get_value_int32(env, args[0], &pin);
    assert(status == napi_ok);

    status = napi_get_value_int32(env, args[1], &drive);
    assert(status == napi_ok);

    int ret = set(pin,drive);

    napi_value n_ret;
    status = napi_create_int32(env, ret, &n_ret);
    assert(status == napi_ok);

    return n_ret;
}


// NodeJS GPIO get function
napi_value Get(napi_env env, napi_callback_info info) {
    napi_status status;

    size_t argc = 3;
    napi_value args[argc];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    assert(status == napi_ok);

    if (argc < 3) {
        napi_throw_type_error(env, nullptr, "Wrong number of arguments");
        return nullptr;
    }

    napi_valuetype pin_valuetype;
    napi_valuetype func_valuetype;
    napi_valuetype pu_valuetype;

    status = napi_typeof(env, args[0], &pin_valuetype);
    assert(status == napi_ok);

    status = napi_typeof(env, args[1], &func_valuetype);
    assert(status == napi_ok);

    status = napi_typeof(env, args[2], &pu_valuetype);
    assert(status == napi_ok);

    if (pin_valuetype != napi_number || func_valuetype != napi_number || pu_valuetype != napi_number  ) {
        napi_throw_type_error(env, nullptr, "Wrong arguments");
        return nullptr;
    }

    int pin;
    int func;
    int pull_mode;

    status = napi_get_value_int32(env, args[0], &pin);
    assert(status == napi_ok);

    status = napi_get_value_int32(env, args[1], &func);
    assert(status == napi_ok);

    status = napi_get_value_int32(env, args[2], &pull_mode);
    assert(status == napi_ok);

    int ret = get(pin, func, pull_mode);

    napi_value n_ret;
    status = napi_create_int32(env, ret, &n_ret);
    assert(status == napi_ok);

    return n_ret;
}


// NodeJS GPIO pull function
napi_value Pull(napi_env env, napi_callback_info info) {
    napi_status status;

    size_t argc = 2;
    napi_value args[argc];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    assert(status == napi_ok);

    if (argc < 2) {
        napi_throw_type_error(env, nullptr, "Wrong number of arguments");
        return nullptr;
    }

    napi_valuetype pin_valuetype;
    napi_valuetype pull_valuetype;

    status = napi_typeof(env, args[0], &pin_valuetype);
    assert(status == napi_ok);

    status = napi_typeof(env, args[1], &pull_valuetype);
    assert(status == napi_ok);

    if (pin_valuetype != napi_number || pull_valuetype != napi_number ) {
        napi_throw_type_error(env, nullptr, "Wrong arguments");
        return nullptr;
    }

    int pin;
    int pull_mode;

    status = napi_get_value_int32(env, args[0], &pin);
    assert(status == napi_ok);

    status = napi_get_value_int32(env, args[1], &pull_mode);
    assert(status == napi_ok);

    int ret = pull(pin, pull_mode);

    napi_value n_ret;
    status = napi_create_int32(env, ret, &n_ret);
    assert(status == napi_ok);

    return n_ret;
}


#define DECLARE_NAPI_METHOD(name, func)                                        \
  { name, 0, func, 0, 0, 0, napi_default, 0 }

napi_value Init(napi_env env, napi_value exports) {
    napi_status status;

    napi_property_descriptor addDescriptor = DECLARE_NAPI_METHOD("toggle", Toggle);
    status = napi_define_properties(env, exports, 1, &addDescriptor);
    assert(status == napi_ok);

    napi_property_descriptor addDescriptor1 = DECLARE_NAPI_METHOD("set", Set);
    status = napi_define_properties(env, exports, 1, &addDescriptor1);
    assert(status == napi_ok);

    napi_property_descriptor addDescriptor2 = DECLARE_NAPI_METHOD("get", Get);
    status = napi_define_properties(env, exports, 1, &addDescriptor2);
    assert(status == napi_ok);

    napi_property_descriptor addDescriptor3 = DECLARE_NAPI_METHOD("pull", Pull);
    status = napi_define_properties(env, exports, 1, &addDescriptor3);
    assert(status == napi_ok);
    
    napi_property_descriptor addDescriptor4 = DECLARE_NAPI_METHOD("readUltrasonic", ReadUltrasonic);
    status = napi_define_properties(env, exports, 1, &addDescriptor4);
    assert(status == napi_ok);

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)

