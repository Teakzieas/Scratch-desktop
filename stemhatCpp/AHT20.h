#include <linux/i2c-dev.h>
#include <fcntl.h>
#include <unistd.h>
#include <iostream>
#include <vector>
#include <cstring>
#include <cmath>

float AHT20Read(int type) {
    const char* device = "/dev/i2c-1";
    int file = open(device, O_RDWR);
    if (file < 0) {
        std::cerr << "Failed to open the I2C bus" << std::endl;
        return -1;
    }

    int addr = 0x38; // AHT20 sensor address
    if (ioctl(file, I2C_SLAVE, addr) < 0) {
        std::cerr << "Failed to acquire bus access or talk to slave" << std::endl;
        close(file);
        return -1;
    }

    // Initialize the AHT20 sensor
    unsigned char initData[1] = {0xBE};
    if (write(file, initData, 1) != 1) {
        std::cerr << "Failed to initialize AHT20 sensor" << std::endl;
        close(file);
        return -1;
    }
    usleep(10000); // 10 ms delay

    // Trigger a measurement
    unsigned char measureData[3] = {0xAC, 0x33, 0x00};
    if (write(file, measureData, 3) != 3) {
        std::cerr << "Failed to trigger measurement" << std::endl;
        close(file);
        return -1;
    }
    usleep(80000); // 80 ms delay

    // Read sensor data
    unsigned char sensorData[6];
    if (read(file, sensorData, 6) != 6) {
        std::cerr << "Failed to read sensor data" << std::endl;
        close(file);
        return -1;
    }

    close(file);

    // Parse the data to extract temperature and humidity
    float humidity = ((sensorData[1] << 12) | (sensorData[2] << 4) | (sensorData[3] >> 4)) * 100.0 / 1048576.0;
    float temperature = (((sensorData[3] & 0x0F) << 16) | (sensorData[4] << 8) | sensorData[5]) * 200.0 / 1048576.0 - 50.0;

    if (type == 1) {
        return round(humidity * 10) / 10.0; // Return humidity to 1 decimal place
    } else if (type == 0) {
        return round(temperature * 10) / 10.0; // Return temperature to 1 decimal place
    }

    return -1; // Invalid type
}
