#ifndef I2CDEVICE_H
#define I2CDEVICE_H

#include <iostream>
#include <fcntl.h>
#include <unistd.h>
#include <sys/ioctl.h>
#include <linux/i2c-dev.h>
#include <cstdint>

class I2CDevice {
private:
    int i2c_fd;       // File descriptor for the I2C device
    int device_addr;  // I2C address of the device

public:
    // Constructor
    I2CDevice(const char* device, int address) : i2c_fd(-1), device_addr(address) {
        i2c_fd = open(device, O_RDWR);
        if (i2c_fd < 0) {
            throw std::runtime_error("Failed to open the I2C bus");
        }
        if (ioctl(i2c_fd, I2C_SLAVE, device_addr) < 0) {
            close(i2c_fd);
            throw std::runtime_error("Failed to acquire bus access or talk to the slave");
        }
    }

    // Destructor
    ~I2CDevice() {
        if (i2c_fd >= 0) {
            close(i2c_fd);
        }
    }

    // Write data to a specific register
    bool writeToRegister(uint8_t reg, uint8_t data) const {
        uint8_t buffer[2] = {reg, data};
        if (write(i2c_fd, buffer, 2) != 2) {
            std::cerr << "Failed to write to the I2C device.\n";
            return false;
        }
        return true;
    }

    // Read data from a specific register
    bool readFromRegister(uint8_t reg, uint8_t& data) const {
        // Write the register address to the device
        if (write(i2c_fd, &reg, 1) != 1) {
            std::cerr << "Failed to write register address to the I2C device.\n";
            return false;
        }

        // Read 1 byte of data from the register
        if (read(i2c_fd, &data, 1) != 1) {
            std::cerr << "Failed to read from the I2C device.\n";
            return false;
        }

        return true;
    }
};

#endif // I2CDEVICE_H
