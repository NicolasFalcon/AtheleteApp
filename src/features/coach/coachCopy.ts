import { useCallback } from 'react';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';

// ATHELETE Coach copy by i18n key (handoff v2.20 §30, es/en by
// profiles.language). Same pattern as workoutsCopy / routeCopy: "{name}"
// placeholders are replaced with `vars.name`.
const COPY = {
  // ── Shared ──
  'coach.brand': { es: 'ATHELETE Coach', en: 'ATHELETE Coach' },
  'coach.cancel': { es: 'Cancelar', en: 'Cancel' },
  'coach.retry': { es: 'Reintentar', en: 'Retry' },
  'coach.optional': { es: 'Opcional', en: 'Optional' },
  'coach.required': { es: 'Obligatorio', en: 'Required' },
  'coach.next': { es: 'Siguiente', en: 'Next' },
  'coach.tag': { es: 'Coach', en: 'Coach' },
  'coach.loadError': { es: 'No pudimos cargar los datos de Coach.', en: "We couldn't load Coach data." },
  'coach.share.training': { es: 'Entrenamientos', en: 'Workouts' },
  'coach.share.training.body': {
    es: 'Sesiones, rutina y valoraciones. Necesario para que tu coach te asigne rutinas.',
    en: 'Sessions, routine and ratings. Needed for your coach to assign you routines.',
  },
  'coach.share.nutrition': { es: 'Nutrición', en: 'Nutrition' },
  'coach.share.nutrition.body': {
    es: 'Objetivos, comidas registradas e hidratación.',
    en: 'Targets, logged meals and hydration.',
  },
  'coach.share.body': { es: 'Peso y sueño', en: 'Weight & sleep' },
  'coach.share.body.body': {
    es: 'Peso corporal, horas de sueño y recuperación.',
    en: 'Body weight, sleep hours and recovery.',
  },
  'coach.days.perWeek.one': { es: '{n} día', en: '{n} day' },
  'coach.days.perWeek.other': { es: '{n} días', en: '{n} days' },
  'coach.weeks.one': { es: '{n} semana', en: '{n} week' },
  'coach.weeks.other': { es: '{n} semanas', en: '{n} weeks' },
  'coach.weeks.none': { es: 'Sin fecha de fin', en: 'No end date' },
  'coach.since': { es: 'Desde el {date}', en: 'From {date}' },
  'coach.macro.protein': { es: 'Proteína', en: 'Protein' },
  'coach.macro.carbs': { es: 'Carbohidratos', en: 'Carbs' },
  'coach.macro.carbsShort': { es: 'Carbos', en: 'Carbs' },
  'coach.macro.fat': { es: 'Grasas', en: 'Fat' },
  'coach.kcalDay': { es: 'kcal / día', en: 'kcal / day' },
  'coach.mode.same': { es: 'Mismo objetivo todos los días', en: 'Same target every day' },
  'coach.mode.trainRest': { es: 'Entreno y descanso', en: 'Training & rest' },
  'coach.dayType.train': { es: 'Día de entreno', en: 'Training day' },
  'coach.dayType.rest': { es: 'Día de descanso', en: 'Rest day' },

  // ── Errors ──
  'coach.error.not_coach': {
    es: 'Tu cuenta no tiene el rol de coach.',
    en: "Your account doesn't have the coach role.",
  },
  'coach.error.not_found': { es: 'No encontramos a este alumno.', en: "We couldn't find this student." },
  'coach.error.invalid_code': {
    es: 'Este código no es válido o ha caducado. Pide uno nuevo a tu coach.',
    en: 'This code is invalid or has expired. Ask your coach for a new one.',
  },
  'coach.error.own_code': {
    es: 'Este es tu propio código de coach.',
    en: 'This is your own coach code.',
  },
  'coach.error.coach_full': {
    es: 'Este coach no tiene plazas libres ahora mismo.',
    en: "This coach doesn't have free spots right now.",
  },
  'coach.error.already_linked': {
    es: 'Ya tienes coach. Desvincúlate de {name} para aceptar esta invitación.',
    en: 'You already have a coach. Unlink from {name} to accept this invitation.',
  },
  'coach.error.already_linked.noName': {
    es: 'Ya tienes coach. Desvincúlate en Perfil › Mi coach para aceptar esta invitación.',
    en: 'You already have a coach. Unlink in Profile › My coach to accept this invitation.',
  },
  'coach.error.nutrition_not_shared': {
    es: '{name} no comparte Nutrición. Puede activarlo en Perfil › Mi coach.',
    en: "{name} doesn't share Nutrition. They can turn it on in Profile › My coach.",
  },
  'coach.error.link_not_active': {
    es: 'El vínculo con este alumno ya no está activo.',
    en: 'The link with this student is no longer active.',
  },
  'coach.error.kcal': {
    es: 'Las kcal deben estar entre 1.000 y 6.000.',
    en: 'Calories must be between 1,000 and 6,000.',
  },
  'coach.error.macros': {
    es: 'Las macros no cuadran con las kcal (margen ±10 %).',
    en: "Macros don't add up to the calories (±10 % margin).",
  },
  'coach.error.safety': {
    es: 'Los objetivos quedan por debajo del mínimo de seguridad.',
    en: 'The targets fall below the safety minimum.',
  },
  'coach.error.invalid_targets': {
    es: 'Los objetivos no son válidos o el perfil del alumno está incompleto.',
    en: "The targets are invalid or the student's profile is incomplete.",
  },
  'coach.error.invalid_input': {
    es: 'Revisa los datos: hay algo que no es válido.',
    en: 'Check the details: something is not valid.',
  },
  'coach.error.offline': {
    es: 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
    en: "You're offline. Check your connection and try again.",
  },
  'coach.error.unknown': {
    es: 'Algo salió mal. Inténtalo de nuevo.',
    en: 'Something went wrong. Try again.',
  },

  // ── Coach · Entrenos / Mis alumnos ──
  'coach.tabs.mine': { es: 'Mis entrenos', en: 'My workouts' },
  'coach.tabs.students': { es: 'Mis alumnos', en: 'My students' },
  'coach.students.title': { es: 'Mis alumnos', en: 'My students' },
  'coach.students.subtitle': { es: 'ATHELETE Coach · beta', en: 'ATHELETE Coach · beta' },
  'coach.students.invite': { es: 'Invitar alumno', en: 'Invite student' },
  'coach.stats.students': { es: 'Alumnos', en: 'Students' },
  'coach.stats.withRoutine': { es: 'Con rutina', en: 'With routine' },
  'coach.stats.withNutrition': { es: 'Con plan nutricional', en: 'With nutrition plan' },
  'coach.stats.left.one': { es: 'Queda {n} plaza en la beta', en: '{n} spot left in the beta' },
  'coach.stats.left.other': { es: 'Quedan {n} plazas en la beta', en: '{n} spots left in the beta' },
  'coach.stats.full': {
    es: 'Has llegado al límite de {max} alumnos de la beta',
    en: "You've reached the beta limit of {max} students",
  },
  'coach.list.title': { es: 'Alumnos', en: 'Students' },
  'coach.list.week': { es: 'Semana actual', en: 'This week' },
  'coach.list.sessions': { es: '{done} de {planned} sesiones', en: '{done} of {planned} sessions' },
  'coach.list.sessions.one': { es: '{done} de {planned} sesión', en: '{done} of {planned} session' },
  'coach.list.noRoutine': { es: 'Sin rutina asignada', en: 'No routine assigned' },
  'coach.list.inactive': { es: 'Sin entrenar hace {n} días', en: 'No training for {n} days' },
  'coach.list.nutritionPending': { es: 'Nutrición pendiente de aceptar', en: 'Nutrition pending acceptance' },
  'coach.list.invitePending': { es: 'Invitación pendiente', en: 'Invitation pending' },
  'coach.list.inviteSent': { es: 'Código enviado {when}', en: 'Code sent {when}' },
  'coach.list.ended': { es: 'Desvinculado', en: 'Unlinked' },
  'coach.list.endedBody': { es: 'Ya no comparte datos contigo', en: 'No longer shares data with you' },
  'coach.empty.title': { es: 'Aún no tienes alumnos', en: "You don't have students yet" },
  'coach.empty.body': {
    es: 'Invita a tus alumnos con un código. Ellos eligen qué compartir contigo y tú les asignas rutinas y objetivos.',
    en: 'Invite your students with a code. They choose what to share with you and you assign routines and targets.',
  },
  'coach.home.students': { es: '/{max} alumnos', en: '/{max} students' },

  // ── Invite sheet ──
  'coach.invite.title': { es: 'Invitar alumno', en: 'Invite student' },
  'coach.invite.body': {
    es: 'Comparte este código. Tu alumno lo introduce en Perfil › Tengo un coach, o abre el enlace directamente.',
    en: 'Share this code. Your student enters it in Profile › I have a coach, or opens the link directly.',
  },
  'coach.invite.validity': { es: 'Válido 7 días · un solo uso', en: 'Valid 7 days · single use' },
  'coach.invite.copy': { es: 'Copiar', en: 'Copy' },
  'coach.invite.copied': { es: 'Copiado', en: 'Copied' },
  'coach.invite.share': { es: 'Compartir enlace', en: 'Share link' },
  'coach.invite.footer': { es: 'Tu alumno elige qué compartir contigo.', en: 'Your student chooses what to share with you.' },
  'coach.invite.ready': { es: 'Enlace de invitación listo para compartir', en: 'Invitation link ready to share' },
  'coach.invite.message': {
    es: 'Únete a mí en ATHELETE Coach. Código: {code}\n{url}',
    en: 'Join me on ATHELETE Coach. Code: {code}\n{url}',
  },
  'coach.invite.again': { es: 'Invitar de nuevo', en: 'Invite again' },
  'coach.invite.regenerate': { es: 'Generar código nuevo', en: 'Generate a new code' },
  'coach.invite.resend': { es: 'Reenviar enlace', en: 'Resend link' },
  'coach.invite.cancel': { es: 'Cancelar invitación', en: 'Cancel invitation' },
  'coach.invite.cancelled': { es: 'Invitación cancelada', en: 'Invitation cancelled' },
  'coach.invite.loading': { es: 'Preparando tu código…', en: 'Preparing your code…' },

  // ── Student detail ──
  'coach.detail.header': { es: 'Alumno', en: 'Student' },
  'coach.detail.shares': { es: 'Qué comparte contigo', en: 'What they share with you' },
  'coach.detail.week': { es: 'Esta semana', en: 'This week' },
  'coach.detail.adherence': { es: 'adherencia', en: 'adherence' },
  'coach.detail.today': { es: 'Hoy', en: 'Today' },
  'coach.detail.legend.done': { es: 'Hecha', en: 'Done' },
  'coach.detail.legend.planned': { es: 'Planificada', en: 'Planned' },
  'coach.detail.legend.missed': { es: 'Perdida', en: 'Missed' },
  'coach.detail.sessions': { es: '{done} de {planned} sesiones', en: '{done} of {planned} sessions' },
  'coach.detail.sessions.one': { es: '{done} de {planned} sesión', en: '{done} of {planned} session' },
  'coach.detail.missed.one': { es: '{n} perdida', en: '{n} missed' },
  'coach.detail.missed.other': { es: '{n} perdidas', en: '{n} missed' },
  'coach.detail.lastSession': { es: 'Última sesión · {when}', en: 'Last session · {when}' },
  'coach.detail.rating': { es: 'Valoración {n}/5', en: 'Rating {n}/5' },
  'coach.detail.noSessions': { es: 'Aún no hay sesiones esta semana.', en: 'No sessions this week yet.' },
  'coach.detail.routine': { es: 'Rutina asignada', en: 'Assigned routine' },
  'coach.detail.yourNote': { es: 'Tu nota', en: 'Your note' },
  'coach.detail.change': { es: 'Cambiar', en: 'Change' },
  'coach.detail.editCopy': { es: 'Editar copia', en: 'Edit copy' },
  'coach.detail.endRoutine': { es: 'Terminar rutina', en: 'End routine' },
  'coach.detail.endRoutine.title': { es: '¿Terminar la rutina?', en: 'End the routine?' },
  'coach.detail.endRoutine.body': {
    es: 'Se quita de los próximos días de {name}. Lo ya entrenado no cambia.',
    en: "It's removed from {name}'s upcoming days. Past sessions don't change.",
  },
  'coach.detail.endRoutine.done': { es: 'Rutina terminada', en: 'Routine ended' },
  'coach.detail.noRoutine': {
    es: '{name} aún no tiene rutina. Asígnale una y aparecerá en su semana.',
    en: "{name} doesn't have a routine yet. Assign one and it shows up in their week.",
  },
  'coach.detail.assignRoutine': { es: 'Asignar rutina', en: 'Assign routine' },
  'coach.detail.nutrition': { es: 'Plan nutricional', en: 'Nutrition plan' },
  'coach.detail.nutrition.accepted': { es: 'Aceptado', en: 'Accepted' },
  'coach.detail.nutrition.pending': { es: 'Pendiente de aceptar', en: 'Pending acceptance' },
  'coach.detail.nutrition.declined': { es: 'No aceptado', en: 'Not accepted' },
  'coach.detail.nutrition.none': { es: 'No asignado', en: 'Not assigned' },
  'coach.detail.nutrition.noPlan': {
    es: 'Aún no le has enviado objetivos de nutrición.',
    en: "You haven't sent nutrition targets yet.",
  },
  'coach.detail.nutrition.edit': { es: 'Editar objetivos', en: 'Edit targets' },
  'coach.detail.nutrition.assign': { es: 'Asignar nutrición', en: 'Assign nutrition' },
  'coach.detail.locked': { es: 'No compartido por el alumno', en: 'Not shared by the student' },
  'coach.detail.locked.nutrition': {
    es: '{name} no comparte Nutrición. Puede activarlo en Perfil › Mi coach.',
    en: "{name} doesn't share Nutrition. They can turn it on in Profile › My coach.",
  },
  'coach.detail.locked.body': {
    es: '{name} no comparte Peso y sueño. Puede activarlo en Perfil › Mi coach.',
    en: "{name} doesn't share Weight & sleep. They can turn it on in Profile › My coach.",
  },
  'coach.detail.discomfort': { es: 'Molestias recientes', en: 'Recent discomfort' },
  'coach.detail.discomfort.none': {
    es: 'Sin molestias registradas en los últimos 14 días.',
    en: 'No discomfort logged in the last 14 days.',
  },
  'coach.detail.body': { es: 'Peso y sueño', en: 'Weight & sleep' },
  'coach.detail.weight': { es: 'Peso', en: 'Weight' },
  'coach.detail.weight.trend': { es: '{change} kg en 4 semanas', en: '{change} kg in 4 weeks' },
  'coach.detail.weight.none': { es: 'Sin registros', en: 'No logs' },
  'coach.detail.sleep': { es: 'Sueño', en: 'Sleep' },
  'coach.detail.sleep.avg': { es: 'media de 7 noches', en: '7-night average' },
  'coach.detail.menu': { es: 'Más opciones', en: 'More options' },
  'coach.detail.unlink': { es: 'Desvincular alumno', en: 'Unlink student' },
  'coach.detail.unlink.title': { es: '¿Desvincular a {name}?', en: 'Unlink {name}?' },
  'coach.detail.unlink.body': {
    es: 'Dejarás de ver sus entrenos y lo que comparte. Su rutina y sus objetivos se quedan en su app como copia propia.',
    en: 'You will stop seeing their workouts and what they share. Their routine and targets stay in their app as their own copy.',
  },
  'coach.detail.unlink.cta': { es: 'Desvincular', en: 'Unlink' },
  'coach.detail.unlinked': { es: '{name} ya no está vinculado/a a tu cuenta', en: '{name} is no longer linked to your account' },
  'coach.detail.pending.body': {
    es: 'Todavía no ha aceptado tu invitación. Cuando la acepte verás su semana aquí.',
    en: "They haven't accepted your invitation yet. Once they do, you'll see their week here.",
  },
  'coach.detail.ended.body': {
    es: 'Desvinculado · ya no comparte datos contigo.',
    en: 'Unlinked · no longer shares data with you.',
  },
  'coach.detail.ended.on': {
    es: 'Desvinculado · se desvinculó el {date}.',
    en: 'Unlinked · unlinked on {date}.',
  },

  // ── Assign routine ──
  'coach.assign.title': { es: 'Asignar rutina', en: 'Assign routine' },
  'coach.assign.for': { es: 'Para {name}', en: 'For {name}' },
  'coach.assign.step': { es: '{n} de 3', en: '{n} of 3' },
  'coach.assign.step1': { es: 'Elige la rutina', en: 'Choose the routine' },
  'coach.assign.step2': { es: 'Programa', en: 'Schedule' },
  'coach.assign.step3': { es: 'Nota y resumen', en: 'Note & summary' },
  'coach.assign.tab.mine': { es: 'Mis rutinas', en: 'My routines' },
  'coach.assign.tab.catalog': { es: 'Catálogo ATHELETE', en: 'ATHELETE catalog' },
  'coach.assign.tab.create': { es: 'Crear nueva', en: 'Create new' },
  'coach.assign.mine.empty': {
    es: 'Aún no tienes rutinas propias. Crea una o elige del catálogo.',
    en: "You don't have routines yet. Create one or pick from the catalog.",
  },
  'coach.assign.catalog.more': { es: 'Cargar más', en: 'Load more' },
  'coach.assign.create.title': { es: 'Crear una rutina nueva', en: 'Create a new routine' },
  'coach.assign.create.body': {
    es: 'Se abre el editor de rutinas de siempre. Al guardarla aparece en Mis rutinas y podrás asignarla.',
    en: 'The usual routine editor opens. Once saved it shows up in My routines and you can assign it.',
  },
  'coach.assign.create.cta': { es: 'Abrir editor de rutinas', en: 'Open routine editor' },
  'coach.assign.days': { es: 'Días de la semana', en: 'Days of the week' },
  'coach.assign.daysCount.one': { es: '{n} día por semana', en: '{n} day per week' },
  'coach.assign.daysCount.other': { es: '{n} días por semana', en: '{n} days per week' },
  'coach.assign.start': { es: 'Fecha de inicio', en: 'Start date' },
  'coach.assign.start.today': { es: 'Hoy · {date}', en: 'Today · {date}' },
  'coach.assign.weeks': { es: 'Número de semanas', en: 'Number of weeks' },
  'coach.assign.note': { es: 'Nota para {name}', en: 'Note for {name}' },
  'coach.assign.note.placeholder': {
    es: 'Ej.: sube el peso solo si completas todas las repeticiones.',
    en: 'E.g. only add weight if you complete every rep.',
  },
  'coach.assign.summary.routine': { es: 'Rutina', en: 'Routine' },
  'coach.assign.summary.days': { es: 'Días', en: 'Days' },
  'coach.assign.summary.start': { es: 'Inicio', en: 'Start' },
  'coach.assign.summary.duration': { es: 'Duración', en: 'Duration' },
  'coach.assign.copyNote': {
    es: 'Tu alumno recibe su propia copia; si editas tu plantilla, no cambia la suya hasta que la reasignes.',
    en: "Your student gets their own copy; if you edit your template, theirs doesn't change until you reassign it.",
  },
  'coach.assign.cta': { es: 'Asignar', en: 'Assign' },
  'coach.assign.done': { es: 'Rutina asignada a {name}', en: 'Routine assigned to {name}' },
  'coach.assign.failed': { es: 'No pudimos asignar la rutina', en: "We couldn't assign the routine" },

  // ── Assign nutrition ──
  'coach.nut.title': { es: 'Asignar nutrición', en: 'Assign nutrition' },
  'coach.nut.heading': { es: 'Objetivos diarios', en: 'Daily targets' },
  'coach.nut.daily': { es: 'Objetivo diario', en: 'Daily target' },
  'coach.nut.train': { es: 'Día de entreno', en: 'Training day' },
  'coach.nut.rest': { es: 'Día de descanso', en: 'Rest day' },
  'coach.nut.editing': { es: 'Macros de', en: 'Macros for' },
  'coach.nut.less': { es: 'Restar', en: 'Decrease' },
  'coach.nut.more': { es: 'Sumar', en: 'Increase' },
  'coach.nut.fits': {
    es: 'Las macros suman {sum} kcal · cuadran con el objetivo',
    en: 'Macros add up to {sum} kcal · they match the target',
  },
  'coach.nut.missing': {
    es: 'Faltan {n} kcal por repartir entre macros',
    en: '{n} kcal left to split between macros',
  },
  'coach.nut.over': {
    es: 'Las macros superan el objetivo en {n} kcal',
    en: 'Macros exceed the target by {n} kcal',
  },
  'coach.nut.note': { es: 'Nota', en: 'Note' },
  'coach.nut.note.placeholder': {
    es: 'Ej.: reparte la proteína en 4 comidas.',
    en: 'E.g. split protein across 4 meals.',
  },
  'coach.nut.mustAccept': {
    es: '{name} tendrá que aceptar los objetivos. Hasta entonces sigue con los suyos.',
    en: '{name} will have to accept the targets. Until then they keep their own.',
  },
  'coach.nut.cta': { es: 'Enviar al alumno', en: 'Send to student' },
  'coach.nut.done': {
    es: 'Objetivos enviados a {name} · pendiente de aceptar',
    en: 'Targets sent to {name} · pending acceptance',
  },
  'coach.nut.failed': { es: 'No pudimos enviar los objetivos', en: "We couldn't send the targets" },

  // ── Student · Perfil ──
  'coach.profile.join': { es: 'Tengo un coach', en: 'I have a coach' },
  'coach.profile.join.sub': { es: 'Vincúlate con un código o un enlace', en: 'Link up with a code or a link' },
  'coach.profile.mine': { es: 'Mi coach · {name}', en: 'My coach · {name}' },
  'coach.profile.mine.sub': { es: 'Qué compartes y desvincular', en: 'What you share and unlink' },

  // ── Student · join / consent ──
  'coach.join.title': { es: 'Tengo un coach', en: 'I have a coach' },
  'coach.join.body': {
    es: 'Introduce el código que te dio tu coach. Antes de vincularte verás quién es y elegirás qué compartir.',
    en: "Enter the code your coach gave you. Before linking you'll see who they are and choose what to share.",
  },
  'coach.join.placeholder': { es: 'ATH-XXXX', en: 'ATH-XXXX' },
  'coach.join.label': { es: 'Código de tu coach', en: "Your coach's code" },
  'coach.join.continue': { es: 'Continuar', en: 'Continue' },
  'coach.join.or': { es: 'o', en: 'or' },
  'coach.join.link': { es: 'Abrir enlace de invitación', en: 'Open invitation link' },
  'coach.join.link.title': { es: 'Enlace de invitación', en: 'Invitation link' },
  'coach.join.link.body': {
    es: 'Toca el enlace que te envió tu coach (en Mensajes, WhatsApp o el correo) y ATHELETE se abrirá directamente en la invitación. También puedes pegar el enlace completo en el campo del código.',
    en: 'Tap the link your coach sent you (in Messages, WhatsApp or email) and ATHELETE opens right on the invitation. You can also paste the full link into the code field.',
  },
  'coach.join.ok': { es: 'Entendido', en: 'Got it' },
  'coach.consent.wants': {
    es: 'Quiere ser tu coach en ATHELETE. Elige qué puede ver.',
    en: 'Wants to be your coach on ATHELETE. Choose what they can see.',
  },
  'coach.consent.change': {
    es: 'Puedes cambiar esto o desvincularte cuando quieras.',
    en: 'You can change this or unlink whenever you want.',
  },
  'coach.consent.accept': { es: 'Aceptar', en: 'Accept' },
  'coach.consent.linked': { es: 'Vinculado con {name}', en: 'Linked with {name}' },
  'coach.consent.coach': { es: 'Coach', en: 'Coach' },
  'coach.consent.failed': { es: 'No pudimos vincularte', en: "We couldn't link you" },

  // ── Student · Mi coach ──
  'coach.mine.title': { es: 'Mi coach', en: 'My coach' },
  'coach.mine.since': { es: 'Tu coach desde el {date}', en: 'Your coach since {date}' },
  'coach.mine.assignedBy': { es: 'Asignado por {name}', en: 'Assigned by {name}' },
  'coach.mine.noRoutine': { es: 'Sin rutina asignada', en: 'No routine assigned' },
  'coach.mine.noRoutine.sub': {
    es: 'Cuando {name} te asigne una, aparecerá en Entrenos',
    en: 'When {name} assigns you one, it will show up in Workouts',
  },
  'coach.mine.nutrition': { es: 'Objetivos de nutrición', en: 'Nutrition targets' },
  'coach.mine.nutrition.active': { es: 'Plan activo · {kcal} kcal', en: 'Active plan · {kcal} kcal' },
  'coach.mine.nutrition.pending': { es: 'Pendiente de aceptar', en: 'Pending acceptance' },
  'coach.mine.nutrition.none': { es: 'Sin objetivos asignados', en: 'No targets assigned' },
  'coach.mine.nutrition.notShared': { es: 'No compartes Nutrición', en: "You don't share Nutrition" },
  'coach.mine.shares': { es: 'Qué compartes', en: 'What you share' },
  'coach.mine.shares.note': {
    es: 'Los cambios se aplican al momento. {name} solo ve lo que tienes activado.',
    en: 'Changes apply right away. {name} only sees what you have turned on.',
  },
  'coach.mine.shares.failed': { es: 'No pudimos guardar el cambio', en: "We couldn't save the change" },
  'coach.mine.unlink': { es: 'Desvincularme', en: 'Unlink me' },
  'coach.mine.unlink.title': { es: '¿Desvincularte de {name}?', en: 'Unlink from {name}?' },
  'coach.mine.unlink.body': {
    es: 'Dejará de ver tus datos al momento. Conservas la rutina y los objetivos que te asignó como tuyos.',
    en: "They'll stop seeing your data right away. You keep the routine and targets they assigned as your own.",
  },
  'coach.mine.unlinked': { es: 'Te has desvinculado de {name}', en: "You've unlinked from {name}" },
  'coach.mine.none': {
    es: 'No tienes coach vinculado.',
    en: "You don't have a linked coach.",
  },

  // ── Student · Nutrición ──
  'coach.offer.eyebrow': { es: '{name} · tu coach', en: '{name} · your coach' },
  'coach.offer.title': { es: 'Tu coach te asignó nuevos objetivos', en: 'Your coach assigned you new targets' },
  'coach.offer.later': { es: 'Ahora no', en: 'Not now' },
  'coach.offer.accept': { es: 'Aceptar', en: 'Accept' },
  'coach.offer.accepted': { es: 'Objetivos de tu coach activados', en: "Your coach's targets are active" },
  'coach.offer.failed': { es: 'No pudimos responder. Inténtalo de nuevo.', en: "We couldn't respond. Try again." },
  'coach.offer.declined': {
    es: 'Tienes objetivos de {name} sin activar',
    en: 'You have targets from {name} not activated',
  },
  'coach.offer.activate': { es: 'Activar', en: 'Activate' },
  'coach.plan.chip': { es: 'Plan de tu coach', en: "Your coach's plan" },
  'coach.plan.by': { es: 'Objetivos de {name}', en: 'Targets by {name}' },

  // ── Routine detail (student copy) ──
  'coach.routine.noteOf': { es: 'Nota de {name}', en: 'Note from {name}' },
  'coach.routine.copy': {
    es: 'Es tu copia. Si {name} cambia su plantilla, te llegará solo cuando te la reasigne.',
    en: "It's your copy. If {name} changes their template, you'll only get it when they reassign it.",
  },
  'coach.routine.days': { es: 'Tus días', en: 'Your days' },
} as const satisfies Record<string, Record<EllieLanguage, string>>;

export type CoachCopyKey = keyof typeof COPY;
export type CoachVars = Record<string, string | number>;

export function coachText(language: EllieLanguage, key: CoachCopyKey, vars: CoachVars = {}): string {
  return COPY[key][language].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export type CoachT = (key: CoachCopyKey, vars?: CoachVars) => string;

// The text function of the current profile language.
export function useCoachText(): { t: CoachT; language: EllieLanguage } {
  const language = useProfileLanguage();
  const t = useCallback<CoachT>((key, vars) => coachText(language, key, vars), [language]);
  return { t, language };
}
