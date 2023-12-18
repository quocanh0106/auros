import './account.scss';

function getGraphQlHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Shopify-Storefront-Access-Token': window.apis.storefrontAccessToken,
  };
}

function executeGraphQlQuery({ query, variables }) {
  const url = window.apis.graphQlEndpoint;

  const cleanQuery = query.replace(/\n/g, ' ').replace(/ {2}/g, '');

  const config = {
    method: 'post',
    headers: getGraphQlHeaders(),
    body: JSON.stringify({
      query: cleanQuery,
      ...(variables ? { variables } : {}),
    }),
  };

  return fetch(url, config);
}

class TogglePassword extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.eye = this.querySelector('.eye');
    this.eye.addEventListener('click', this.togglePassword.bind(this));
  }

  togglePassword() {
    if (this.input.type == 'password') {
      this.input.type = 'text';
      this.eye.classList.add('active');
    } else {
      this.input.type = 'password';
      this.eye.classList.remove('active');
    }
  }
}

customElements.define('toggle-password', TogglePassword);

class AccountFormCustom extends HTMLElement {
  constructor() {
    super()

    this.form = this.querySelector('form')
    this.buttonSubmit = this.querySelector('button')
    this.attachEvent()
  }

  formToObject = (form) => {
    const formData = new FormData(form)
    const formObject = {}

    for (const [key, value] of formData.entries()) {
      const keys = key.split('[').map((k) => k.replace(']', ''))
      let obj = formObject
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]
        obj[k] = obj[k] || {}
        obj = obj[k]
      }
      const k = keys[keys.length - 1]
      obj[k] = value
    }

    return formObject
  }

  setCookie = (name, value, days) => {
    let expires = ''
    if (days) {
      const date = new Date()
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
      expires = '; expires=' + date.toUTCString()
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/'
  }


  async handleAccessToken() {
    const formObject = this.formToObject(this.form);
    const data = {
      email: formObject.customer.email,
      password: formObject.customer.password
    }

    const customer = await this.getCustomerAccessToken(data);
    const { customerAccessToken } = customer.data.customerAccessTokenCreate;
    if (customerAccessToken) {
      this.setCookie('customerAccessToken', customerAccessToken.accessToken, 1)
    }
    window.location.href = window.routes.account;
  }

  async getCustomerAccessToken({ email, password }) {
    const variables = {
      input: {
        email,
        password
      }
    }
    const query = this.getQueryCustomerAccessToken();

    const res = await executeGraphQlQuery({ query, variables });
    const data = await res.json();
    return data;
  }

  getQueryCustomerAccessToken() {
    return `mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }`
  }

  attachEvent() {
    this.buttonSubmit.addEventListener('click', (event) => { this.onSubmit(event) });
  }

  onSubmit(event) {
    event.preventDefault();
    const data = new FormData(this.form);
    fetch(this.form.action, { method: 'post', body: data })
      .then(response => { return response }).finally(() => {
        this.handleAccessToken();
      })
  }
}

customElements.define('account-form', AccountFormCustom);

class Logout extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', () => {
      this.deleteCookie();
      window.location.href = window.routes.accountLogout;
    })
  }
  deleteCookie() {
    document.cookie = 'customerAccessToken' + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  };
}

customElements.define('logout-account', Logout);

class AccountInformation extends HTMLElement {
  constructor() {
    super();

    this.form = this.querySelector('form');
    this.inputAll = this.form.querySelectorAll('.input');
    this.buttonSubmit = this.form.querySelector('button');
    this.phoneInput = this.querySelector('#customer_phone');
    window.intlTelInput(this.phoneInput, {
      utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@18.1.1/build/js/utils.js',
    });
    this.iti = intlTelInput(this.phoneInput)

    this.phoneInput.addEventListener('countrychange', () => {
      this.iti.getNumber(intlTelInputUtils.numberFormat.E164);
      this.buttonSubmit.disabled = false;
      this.phoneInput.value = this.convertNumber();
    });
    
    this.phoneInput.value = this.convertNumber();

    this.inputAll.forEach((item) => {
      item.addEventListener('input', (e) => {
        let allFilled = true;
        const isValid = e.target.reportValidity();
        e.target.setAttribute('aria-invalid', !isValid);
        this.inputAll.forEach((item) => {
          if (!item.value) {
            allFilled = false;
          }
        });
        this.buttonSubmit.disabled = !allFilled;
      });
    });

    this.buttonSubmit &&
      this.buttonSubmit.addEventListener('click', this.onFormSubmit.bind(this));
  }

  getCookie(name) {
    const pair = document.cookie.match(new RegExp(name + '=([^;]+)'));
    return pair ? pair[1] : null;
  };

  changeAccountInfo(customerAccessToken, customerData) {
    const variables = {
      customerAccessToken,
      customer: customerData.customer
    };
    const query = this.getQueryCustomerUpdate();

    this.buttonSubmit.classList.add('is-loading');
    executeGraphQlQuery({ query, variables })
      .then((res) => res.json())
      .then((data) => {
        if (data.errors || data.data.customerUpdate.userErrors.length > 0) {
          const msg = data.data?.customerUpdate?.userErrors.map(
            (error) => error.message
          );
          alert(msg.join(' and '));
        } else {
          location.reload();
        }
        this.buttonSubmit.classList.remove('is-loading');
      });
  }

  getQueryCustomerUpdate() {
    return 'mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) { customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) { customer { id firstName lastName email phone } customerAccessToken { accessToken expiresAt } userErrors { field message } } }';
  }

  async onFormSubmit(e) {
    e.preventDefault();
    this.phoneInput.value = this.convertNumber();

    if (this.form.checkValidity()) {
      const formObject = this.formToObject(this.form);
      const accessToken = this.getCookie('customerAccessToken');
      this.changeAccountInfo(accessToken, formObject);
    }
  }

  convertNumber() {
    if(this.phoneInput.value.includes(`+${this.iti.getSelectedCountryData().dialCode}`)) {
      this.phoneInput.value = '+' + this.phoneInput.value.replace(/[^\d]/g, '');
    } else {
      if (this.phoneInput.value[0] == '0') {
        this.phoneInput.value = this.phoneInput.value.replace(/[^\d]/g, '');
        this.phoneInput.value = `+${this.iti.getSelectedCountryData().dialCode}` + this.phoneInput.value.slice(1);
      } else {
        this.phoneInput.value = this.phoneInput.value.replace(/[^\d]/g, '');
        this.phoneInput.value = `+${this.iti.getSelectedCountryData().dialCode}` + this.phoneInput.value;
      }
    }
    return this.phoneInput.value;
  }
  formToObject(form) {
    const formData = new FormData(form);
    const formObject = {};

    for (const [key, value] of formData.entries()) {
      const keys = key.split('[').map((k) => k.replace(']', ''));
      let obj = formObject;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        obj[k] = obj[k] || {};
        obj = obj[k];
      }
      const k = keys[keys.length - 1];
      obj[k] = value;
    }

    return formObject;
  }
}

if (!customElements.get('account-information')) {
  customElements.define('account-information', AccountInformation);
}