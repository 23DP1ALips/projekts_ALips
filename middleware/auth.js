function pieprasitAutorizaciju(req, res, next) {
    if (!req.session.lietotajs) {
        req.flash('error', req.t('flash.login_required'));
        return res.redirect('/pieslegties?nakamais=' + encodeURIComponent(req.originalUrl));
    }
    next();
}

function pieprasitAdministratoru(req, res, next) {
    if (!req.session.lietotajs) {
        req.flash('error', req.t('error.login_required'));
        return res.redirect('/pieslegties');
    }
    if (req.session.lietotajs.loma !== 'administrators') {
        return res.status(403).render('error', { pageTitle: req.t('error.403_title'), kods: 403, zinojums: req.t('error.admin_only') });
    }
    next();
}

function noverstAutorizetus(req, res, next) {
    if (req.session.lietotajs) {
        return res.redirect('/');
    }
    next();
}

module.exports = { pieprasitAutorizaciju, pieprasitAdministratoru, noverstAutorizetus };
