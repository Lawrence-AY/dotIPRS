class MockIPRSClient {
  async getDataByIdCard(payload) {
    return this.mockPerson(payload.idNumber);
  }

  async getDataByPin(payload) {
    return this.mockPerson(null, { KRAPin: payload.pin });
  }

  async getDataByPassport(payload) {
    return this.mockPerson(null, { PassportNumber: payload.passportNumber });
  }

  async getDataByBirthCertificate(payload) {
    return this.mockPerson(null, { BirthCertificateNumber: payload.certificateNumber });
  }

  async getDataByDeathCertificate(payload) {
    return this.mockPerson(null, { DeathCertificateNumber: payload.certificateNumber });
  }

  async getDataByAlienCard(payload) {
    return this.mockPerson(null, { AlienCardNumber: payload.alienCardNumber });
  }

  async verificationByIdCard(payload) {
    return this.mockPerson(payload.idNumber, { Verified: true });
  }

  async verificationByPassport(payload) {
    return this.mockPerson(null, { PassportNumber: payload.passportNumber, Verified: true });
  }

  async verificationByAlienCard(payload) {
    return this.mockPerson(null, { AlienCardNumber: payload.alienCardNumber, Verified: true });
  }

  mockPerson(idNumber, overrides = {}) {
    return [{
      ErrorOccurred: false,
      IDNumber: idNumber || '12345678',
      FirstName: 'Test',
      OtherNames: 'IPRS',
      Surname: 'Citizen',
      Gender: 'F',
      DateOfBirth: '1995-01-01',
      Citizenship: 'Kenyan',
      ...overrides
    }];
  }
}

module.exports = MockIPRSClient;
