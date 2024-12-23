#include <node_api.h>
#include "I2CDevice.h"
#include <stdexcept>

// Helper function to throw JavaScript errors
void ThrowJavaScriptError(napi_env env, const char* message) {
    napi_throw_error(env, nullptr, message);
}

// Wrapper for creating an I2CDevice instance
napi_value CreateDevice(napi_env env, napi_callback_info info) {
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

// Wrapper for writeToRegister
napi_value WriteToRegister(napi_env env, napi_callback_info info) {
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

// Wrapper for readFromRegister
napi_value ReadFromRegister(napi_env env, napi_callback_info info) {
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

// Initialization function for the module
napi_value Init(napi_env env, napi_value exports) {
    napi_value createDeviceFn, writeFn, readFn;

    napi_create_function(env, nullptr, 0, CreateDevice, nullptr, &createDeviceFn);
    napi_set_named_property(env, exports, "createDevice", createDeviceFn);

    napi_create_function(env, nullptr, 0, WriteToRegister, nullptr, &writeFn);
    napi_set_named_property(env, exports, "writeToRegister", writeFn);

    napi_create_function(env, nullptr, 0, ReadFromRegister, nullptr, &readFn);
    napi_set_named_property(env, exports, "readFromRegister", readFn);

    return exports;
}

NAPI_MODULE(i2cdevice, Init)
