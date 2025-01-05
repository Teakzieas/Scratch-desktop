#include <node_api.h>
#include <pigpiod_if2.h>
#include <stdexcept>
#include <assert.h>
#include <stdlib.h>
#include <stdio.h>
#include <chrono>
#include <thread>
#include "I2C.h"
#include "OLED.h"
#include "AHT20.h"

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


void set_pwm_buzzer(int frequency, int pwm_duty_cycle) {
    int pi = pigpio_start(nullptr, nullptr);
    if (pi < 0) {
        std::cerr << "Failed to connect to pigpio daemon!" << std::endl;
        return;
    }

    // Set GPIO pin 19 (BCM pin) as an output pin
    int gpio_pin = 19; // Choose the GPIO pin
    set_mode(pi, gpio_pin, PI_OUTPUT);

    // Set PWM frequency (Hz) and range (0-255 for 8-bit resolution)
    int pwm_range = 255; // PWM range (0-255 for 8-bit)

    // Set PWM frequency and range
    set_PWM_frequency(pi, gpio_pin, frequency);
    set_PWM_range(pi, gpio_pin, pwm_range);

    // Set the PWM duty cycle (0-255)
    set_PWM_dutycycle(pi, gpio_pin, pwm_duty_cycle);
    pigpio_stop(pi); // Disconnect from the pigpio daemon
}


// NodeJs for read_ultrasonic function
napi_value UltrasonicRead(napi_env env, napi_callback_info info) {
    napi_status status;

    // Hardcoded pin values
    const int trig_pin = 20;
    const int echo_pin = 26;

    // Read ultrasonic sensor
    int distance = read_ultrasonic(trig_pin, echo_pin);

    // Create a return value for the distance
    napi_value n_distance;
    status = napi_create_int32(env, distance, &n_distance);
    assert(status == napi_ok);

    return n_distance;
}

napi_value BuzzerSet(napi_env env, napi_callback_info info) {
    napi_status status;

    // Parse the arguments from JavaScript (frequency and pwm_duty_cycle)
    size_t argc = 2; // Expecting two arguments: frequency and pwm_duty_cycle
    napi_value argv[2];
    status = napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
    if (status != napi_ok || argc != 2) {
        napi_throw_error(env, nullptr, "Expected two arguments (frequency, pwm_duty_cycle)");
        return nullptr;
    }

    // Convert the arguments to integers
    int32_t frequency;
    int32_t pwm_duty_cycle;

    // Parse the first argument (frequency)
    status = napi_get_value_int32(env, argv[0], &frequency);
    if (status != napi_ok) {
        napi_throw_error(env, nullptr, "Invalid argument: expected an integer for frequency");
        return nullptr;
    }

    // Parse the second argument (pwm_duty_cycle)
    status = napi_get_value_int32(env, argv[1], &pwm_duty_cycle);
    if (status != napi_ok) {
        napi_throw_error(env, nullptr, "Invalid argument: expected an integer for pwm_duty_cycle");
        return nullptr;
    }

    // Call the C++ function to set the buzzer frequency and duty cycle
    set_pwm_buzzer(frequency, pwm_duty_cycle);

    // Return undefined
    napi_value result;
    status = napi_get_undefined(env, &result);
    assert(status == napi_ok);
    return result;
}

// Helper function to throw JavaScript errors
void ThrowJavaScriptError(napi_env env, const char* message) {
    napi_throw_error(env, nullptr, message);
}

napi_value I2cCreateDevice(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value args[2];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc != 2) {
        ThrowJavaScriptError(env, "Expected 2 arguments: device (string), address (number)");
        return nullptr;
    }

    // Extract arguments
    size_t device_len;
    napi_get_value_string_utf8(env, args[0], nullptr, 0, &device_len);
    char* device = new char[device_len + 1];
    napi_get_value_string_utf8(env, args[0], device, device_len + 1, nullptr);

    int32_t address;
    napi_get_value_int32(env, args[1], &address);

    // Create a new I2CDevice and return a pointer as an external value
    I2CDevice* i2cDevice;
    try {
        i2cDevice = new I2CDevice(device, address);
    } catch (const std::exception& e) {
        delete[] device;  // Clean up the device string
        ThrowJavaScriptError(env, e.what());  // Throw error to JavaScript
        return nullptr;
    }

    delete[] device;  // Clean up the device string

    napi_value result;
    napi_create_external(env, i2cDevice, [](napi_env env, void* data, void* hint) {
        delete static_cast<I2CDevice*>(data);  // Cleanup I2CDevice on GC
    }, nullptr, &result);

    return result;
}

napi_value I2cWriteToRegister(napi_env env, napi_callback_info info) {
    size_t argc = 3;
    napi_value args[3];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc != 3) {
        ThrowJavaScriptError(env, "Expected 3 arguments: device, register (number), data (number)");
        return nullptr;
    }

    // Extract the I2CDevice pointer
    I2CDevice* device;
    napi_get_value_external(env, args[0], reinterpret_cast<void**>(&device));

    // Extract register and data
    uint32_t reg, data;
    napi_get_value_uint32(env, args[1], &reg);
    napi_get_value_uint32(env, args[2], &data);

    // Perform the write operation
    bool success = device->writeToRegister(static_cast<uint8_t>(reg), static_cast<uint8_t>(data));
    napi_value result;
    napi_get_boolean(env, success, &result);
    return result;
}

napi_value I2cReadFromRegister(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value args[2];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc != 2) {
        ThrowJavaScriptError(env, "Expected 2 arguments: device, register (number)");
        return nullptr;
    }

    // Extract the I2CDevice pointer
    I2CDevice* device;
    napi_get_value_external(env, args[0], reinterpret_cast<void**>(&device));

    // Extract register
    uint32_t reg;
    napi_get_value_uint32(env, args[1], &reg);

    // Perform the read operation
    uint8_t data;
    bool success = device->readFromRegister(static_cast<uint8_t>(reg), data);

    if (!success) {
        ThrowJavaScriptError(env, "Failed to read from the I2C device");
        return nullptr;
    }

    napi_value result;
    napi_create_uint32(env, data, &result);
    return result;
}



napi_value OLEDInit(napi_env env, napi_callback_info info) {
    size_t argc = 0;
    napi_value args[0];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc != 0) {
        ThrowJavaScriptError(env, "Expecting No input");
        return nullptr;
    }

    // Perform the read operation
    bool success = OLEDInit();    

    napi_value result;
    napi_get_boolean(env, success, &result);
    return result;
}

napi_value OLEDText(napi_env env, napi_callback_info info) {
    size_t argc = 2;  // Expecting two arguments: text and row
    napi_value args[2];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc != 2) {
        ThrowJavaScriptError(env, "Expecting 2 inputs: text (string) and row (integer)");
        return nullptr;
    }

    // Extract the first argument (text)
    size_t text_length;
    napi_get_value_string_utf8(env, args[0], nullptr, 0, &text_length);
    std::string text(text_length, '\0');
    napi_get_value_string_utf8(env, args[0], &text[0], text_length + 1, nullptr);

    // Extract the second argument (row)
    int32_t row;
    napi_get_value_int32(env, args[1], &row);

    // Call the native function
    int result = OLEDText(text, row);

    if (result != 0) {
        ThrowJavaScriptError(env, "Failed to write text to OLED display");
        return nullptr;
    }

    napi_value napi_result;
    napi_get_boolean(env, true, &napi_result);
    return napi_result;
}

napi_value OLEDClear(napi_env env, napi_callback_info info) {
    size_t argc = 1;  // Expecting one argument: row
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc != 1) {
        ThrowJavaScriptError(env, "Expecting 1 input: row (integer)");
        return nullptr;
    }

    // Extract the argument (row)
    int32_t row;
    napi_get_value_int32(env, args[0], &row);

    // Call the native function
    int result = OLEDClear(row);

    if (result != 0) {
        ThrowJavaScriptError(env, "Failed to clear the OLED display");
        return nullptr;
    }

    napi_value napi_result;
    napi_get_boolean(env, true, &napi_result);
    return napi_result;
}

napi_value AHT20Read(napi_env env, napi_callback_info info) {
    size_t argc = 1;  // Expecting one argument: type
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc != 1) {
        napi_throw_error(env, nullptr, "Expecting 1 input: type (integer) where 0 = temperature, 1 = humidity");
        return nullptr;
    }

    int32_t type;
    napi_get_value_int32(env, args[0], &type);

    if (type != 0 && type != 1) {
        napi_throw_error(env, nullptr, "Invalid input: type must be 0 (temperature) or 1 (humidity)");
        return nullptr;
    }

    float result = AHT20Read(type);

    if (result == -1) {
        napi_throw_error(env, nullptr, "Failed to read data from AHT20 sensor");
        return nullptr;
    }

    napi_value napi_result;
    napi_create_double(env, result, &napi_result);
    return napi_result;
}



napi_value Init(napi_env env, napi_value exports) {
    napi_value I2ccreateDeviceFn,I2cwriteToRegisterFn, I2creadFromRegisterFn, OLEDInitFn, OLEDTextFn, OLEDClearFn,AHT20ReadFn,UltrasonicReadFn,BuzzerSetFn;

    napi_create_function(env, nullptr, 0, I2cCreateDevice, nullptr, &I2ccreateDeviceFn);
    napi_set_named_property(env, exports, "I2ccreateDevice", I2ccreateDeviceFn);

    napi_create_function(env, nullptr, 0, I2cWriteToRegister, nullptr, &I2cwriteToRegisterFn);
    napi_set_named_property(env, exports, "I2cwriteToRegister", I2cwriteToRegisterFn);

    napi_create_function(env, nullptr, 0, I2cReadFromRegister, nullptr, &I2creadFromRegisterFn);
    napi_set_named_property(env, exports, "I2creadFromRegister", I2creadFromRegisterFn);
    
    napi_create_function(env, nullptr, 0, OLEDInit, nullptr, &OLEDInitFn);
    napi_set_named_property(env, exports, "OLEDInit", OLEDInitFn);
    
    napi_create_function(env, nullptr, 0, OLEDText, nullptr, &OLEDTextFn);
    napi_set_named_property(env, exports, "OLEDText", OLEDTextFn);
    
    napi_create_function(env, nullptr, 0, OLEDClear, nullptr, &OLEDClearFn);
    napi_set_named_property(env, exports, "OLEDClear", OLEDClearFn);
    
    napi_create_function(env, nullptr, 0, AHT20Read, nullptr, &AHT20ReadFn);
    napi_set_named_property(env, exports, "AHT20Read", AHT20ReadFn);
    
    napi_create_function(env, nullptr, 0, UltrasonicRead, nullptr, &UltrasonicReadFn);
    napi_set_named_property(env, exports, "UltrasonicRead", UltrasonicReadFn);

	napi_create_function(env, nullptr, 0, BuzzerSet, nullptr, &BuzzerSetFn);
    napi_set_named_property(env, exports, "BuzzerSet", BuzzerSetFn);

    return exports;
}

NAPI_MODULE(i2cdevice, Init)
