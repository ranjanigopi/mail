document.addEventListener('DOMContentLoaded', function () {
    //Send email
    document.querySelector("form").onsubmit = send_email;
    // Use buttons to toggle between views
    document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
    document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
    document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
    document.querySelector('#compose').addEventListener('click', () => compose_email());
    // By default, load the inbox
    load_mailbox('inbox');
});

function send_email() {
    fetch('/emails', {
        method: 'POST',
        body: JSON.stringify({
            recipients: document.querySelector("#compose-recipients").value,
            subject: document.querySelector("#compose-subject").value,
            body: document.querySelector("#compose-body").value
        })
    })
        .then(response => response.json())
        .then(result => {
            // Print result
            console.log(result);
            load_mailbox('sent');
        });
    return false;
}

function set_view(view) {
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'none';
    document.querySelector('#email-view').style.display = 'none';
    document.getElementById(view).style.display = 'block';
}

function compose_email(recipients = '', subject = '', body = '') {
    // Show compose view and hide other views
    set_view("compose-view");
    // Clear out composition fields
    document.querySelector('#compose-recipients').value = recipients;
    document.querySelector('#compose-subject').value = subject;
    document.querySelector('#compose-body').value = body;
}

function load_mailbox(mailbox) {
    // Show the mailbox and hide other views
    set_view("emails-view");
    // Show the mailbox name
    document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;
    // Load emails for given box
    fetch(`/emails/${mailbox}`)
        .then(response => response.json())
        .then(emails => {
            emails.forEach(email => {
                const element = document.createElement("div");
                element.classList.add("email");
                if (email.read) {
                    element.classList.add("read");
                }
                element.innerHTML = `
                    <div class="sender">${email.sender}</div>
                    <div class="subject">${email.subject}</div>
                    <div class="timestamp">${email.timestamp}</div>
                `;

                document.querySelector("#emails-view").append(element);
                element.addEventListener("click", () => load_email(email.id, mailbox))
            })
        });
}

function load_email(id, mailbox) {
    // Show the email view and hide others
    set_view("email-view");
    // Load the given email
    fetch(`/emails/${id}`)
        .then(response => response.json())
        .then(email => show_mail_content(id, email, mailbox !== "sent"))
        // Mark it as read
        .then(() => fetch(`/emails/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                read: true
            })
        }))
}

function construct_button(text, onClick) {
    const button = document.createElement("button");
    button.classList.add("btn", "btn-outline-primary");
    button.innerText = text;
    button.onclick = onClick;

    return button;
}

function show_mail_content(id, email, showArchive) {
    const email_view = document.querySelector('#email-view');
    email_view.innerHTML = `
        <h3>${email.subject}</h3>
        <dl>
            <dt>From:</dt><dd>${email.sender}</dd>
            <dt>To:</dt><dd>${email.recipients.join(', ')}</dd>
            <dt>Timestamp:</dt><dd>${email.timestamp}</dd>
        </dl>
        <hr>
        <p>${email.body}</p>
    `;

    const replyButton = construct_button("Reply", () => reply_mail(email));
    email_view.appendChild(replyButton);

    if (showArchive) {
        const text = email.archived? "Unarchive" : "Archive";
        const archiveButton = construct_button(text, () => archive(id, email.archived));
        email_view.appendChild(document.createTextNode(" "));
        email_view.appendChild(archiveButton);
    }
}

function archive(id, archived) {
    return fetch(`/emails/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            archived: !archived
        })
    })
        .then(() => load_mailbox("inbox"));
}

function reply_mail(email) {
    const subject = /^Re: /i.test(email.subject) ? email.subject : `Re: ${email.subject}`;
    const body = `On ${email.timestamp} ${email.sender} wrote:\n${email.body}\n---\n`
    compose_email(email.sender, subject, body);
}