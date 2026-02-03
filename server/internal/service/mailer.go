package service

import (
	"github.com/Dragodui/db-schemas-generator/internal/config"
	"gopkg.in/gomail.v2"
)

type Mailer interface {
	Send(to, subject, body string) error
}

type SMTPMailer struct {
	Config config.SMTPConfig
}

func (m *SMTPMailer) Send(to, subject, body string) error {
	msg := gomail.NewMessage()
	msg.SetHeader("From", m.Config.From)
	msg.SetHeader("To", to)
	msg.SetHeader("Subject", subject)

	msg.SetBody("text/html", body)

	dial := gomail.NewDialer(m.Config.Host, m.Config.Port, m.Config.User, m.Config.Pass)

	return dial.DialAndSend(msg)
}
